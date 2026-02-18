import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Modal,
  TextField,
  Tooltip,
  IconButton,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Divider,
  Alert,
  FormControlLabel,
  Checkbox,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import Slider from '@mui/material/Slider';
import PercentIcon from '@mui/icons-material/Percent';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import orderApi from '../../api/order';
import companyApi from '../../api/company';
import technicianApi from '../../api/technician';
import productApi from '../../api/product';
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";



const formatCurrency = (value) =>
  `₹${Number(value ?? 0).toFixed(2)}`;


const OrderList = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5
  });

  // Modals
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [openDiscountModal, setOpenDiscountModal] = useState(false);
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);

  // Data
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  const [discountSplit, setDiscountSplit] = useState({ owner: 100, technician: 0 });

//   const [productDiscountSplit, setProductDiscountSplit] = useState({
//   owner: 100,
//   technician: 0
// });

// const [miscDiscountSplit, setMiscDiscountSplit] = useState({
//   owner: 100,
//   technician: 0
// });


  // Form States
  const [draftForm, setDraftForm] = useState({
    TCRNumber: '',
    company: '',
    technician: '',
    freeInstallation: false,
    customer: {
      name: '',
      contact: { phone: '', alternatePhone: '' },
      address: { street: '', city: '', state: '', pincode: '' }
    }
  });

  const [draftError, setDraftError] = useState('');

  const [completeForm, setCompleteForm] = useState({
  products: [],
  miscellaneousCost: 0,
  fittingCost: 0,
  discount: {
    type: 'percentage', // default
    value: 0
  }
});




  // Add this function to handle discount modal opening
  const handleDiscountOpen = (order) => {
    setSelectedOrder(order);
    // Initialize with 100% owner responsibility by default
    setDiscountSplit({ owner: 100, technician: 0 });
    // setMiscDiscountSplit({ owner: 100, technician: 0 });

    setOpenDiscountModal(true);
  };


  // const calculateDiscountAmount = (order) => {
  //   if (!order) return 0;

  //   // Calculate product total
  //   const productTotal = order.products.reduce((sum, item) => {
  //     const price = item.product?.price || 0;
  //     const quantity = item.quantity || 0;
  //     return sum + (price * quantity);
  //   }, 0);

  //   // Calculate total amount
  //   const totalAmount = productTotal +
  //     (order.installationCharge || 0) +
  //     (order.miscellaneousCost || 0);

  //   // Calculate discount amount
  //   return totalAmount * ((order.discountPercentage || 0) / 100);
  // };

  const calculateDiscountAmount = (order) => {
  if (!order) return { product: 0, misc: 0 };

  const productTotal = order.products.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const productDiscount =
    productTotal * ((order.productDiscountPercentage || 0) / 100);

  const miscDiscount =
    (order.miscellaneousCost || 0) *
    ((order.miscDiscountPercentage || 0) / 100);

  return {
    product: productDiscount,
    misc: miscDiscount
  };
};



  const handleApproveDiscount = async () => {
  try {
    setLoading(true);

    await orderApi.approveDiscount(selectedOrder.id, {
      ownerPercentage: discountSplit.owner,
      technicianPercentage: discountSplit.technician
    });

    fetchData();
    setOpenDiscountModal(false);

  } catch (err) {
    setError(
      err.response?.data?.error?.message ||
      'Failed to approve discount'
    );
  } finally {
    setLoading(false);
  }
};


  const handleRejectDiscount = async () => {
    try {
      setLoading(true);
      await orderApi.rejectDiscount(selectedOrder.id);

      fetchData();
      setOpenDiscountModal(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reject discount');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
      try {
        const params = {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
        };
        const res = await orderApi.getDraftOrders(params);

        // Extract data from the new response structure
        const responseData = res.data;
        const ordersArray = responseData.data || [];
        const pagination = responseData.pagination;

        // Calculate total amount for each order
        const ordersWithTotal = ordersArray.map(order => {
          const productTotal = order.products.reduce((sum, product) => {
            return sum + (product.product?.price || 0) * (product.quantity || 0);
          }, 0);

          const installationCharge = order.installationCharge || 0;
          const miscellaneousCost = order.miscellaneousCost || 0;
          const discountPercentage = order.discountPercentage || 0;

          const subtotal = productTotal + installationCharge + miscellaneousCost;
          const discountAmount = (subtotal * discountPercentage) / 100;
          const total = subtotal - discountAmount;

          return {
            ...order,
            id: order._id,
            companyName: order.company?.name,
            technicianName: order.technician?.name,
            customerName: order.customer?.name,
            status: order.status,
            totalAmount: total
          };
        });

        setOrders(ordersWithTotal);
        setTotalRows(pagination?.total || 0);
      } catch (err) {
        setError('Failed to load orders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    
    fetchData();
  }, [paginationModel]);

  // Fetch companies and products
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [companiesRes, productsRes] = await Promise.all([
          companyApi.getCompanies(),
          productApi.getProducts()
        ]);
        setCompanies(companiesRes.data.data);
        setProducts(productsRes.data.data);
      } catch (err) {
        setError('Failed to load resources');
      }
    };
    fetchResources();
  }, []);

  // Fetch technicians when company changes
  useEffect(() => {
  const fetchTechnicians = async () => {
    if (!draftForm.company) {
      setFilteredTechnicians([]);
      return;
    }

    setLoadingTechnicians(true);

    try {
      const res = await technicianApi.getTechnicians({
        companyId: draftForm.company,
        isBlocked: false,

      });

      setFilteredTechnicians(res.data.data);
    } catch (err) {
      setDraftError('Failed to load technicians for this company');
      console.error(err);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  fetchTechnicians();
}, [draftForm.company]);


  // Draft Form Handling
  const handleDraftOpen = () => {
    setDraftForm({
      TCRNumber: '',
      company: '',
      technician: '',
      freeInstallation:false,
      customer: {
        name: '',
        contact: { phone: '', alternatePhone: '' },
        address: { street: '', city: '', state: '', pincode: '' }
      }
    });
    setFilteredTechnicians([]);
    setDraftError('');
    setFormErrors({});
    setOpenCreateModal(true);
  };

  const handleClose = () => {
    setOpenCreateModal(false);
    setOpenCompleteModal(false);
    setOpenViewModal(false);
    setOpenEditModal(false);
  };

  const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const nestedObj = keys.reduce((acc, key) => {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, obj);
    nestedObj[lastKey] = value;
    return { ...obj };
  };

//   const handleDraftChange = (e) => {
//   const { name, value, type, checked } = e.target;

//   if (type === "checkbox") {
//     setDraftForm(prev => ({
//       ...prev,
//       [name]: checked
//     }));
//     return;
//   }

//   if (name === "company") {
//     setDraftForm(prev => ({
//       ...prev,
//       company: value,
//       technician: '' // reset only on manual change
//     }));
//     return;
//   }

//   setDraftForm(prev => ({
//     ...prev,
//     [name]: value
//   }));
// };


  // View/Edit Draft Order
  
  
  const handleDraftChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (type === "checkbox") {
    setDraftForm(prev => ({
      ...prev,
      [name]: checked
    }));
    return;
  }

  if (name === "company") {
    setDraftForm(prev => ({
      ...prev,
      company: value,
      technician: ''
    }));
    return;
  }

  // ✅ Handle nested fields like customer.name
  if (name.includes(".")) {
    const keys = name.split(".");

    setDraftForm(prev => {
      const updated = { ...prev };
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;

      return updated;
    });

    return;
  }

  // normal flat field
  setDraftForm(prev => ({
    ...prev,
    [name]: value
  }));
};

  
  
  const handleViewDraftOpen = (order) => {
    setSelectedOrder(order);
    setOpenViewModal(true);
  };

  const handleEditDraftOpen = (order) => {
    //console.log(order);
    setSelectedOrder({ ...order, technicianName: order.technician?.name });
    setDraftForm({
      TCRNumber: order.TCRNumber || '',
      company: order.company?._id || '',
      technician: order.technician?._id || '',
       freeInstallation: order.freeInstallation,
      customer: {
        name: order.customer?.name || '',
        contact: {
          phone: order.customer?.contact?.phone || '',
          alternatePhone: order.customer?.contact?.alternatePhone || ''
        },
        address: {
          street: order.customer?.address?.street || '',
          city: order.customer?.address?.city || '',
          state: order.customer?.address?.state || '',
          pincode: order.customer?.address?.pincode || ''
        }
      }
    });
    setOpenEditModal(true);
  };

  // Complete Form Handling
  const handleCompleteOpen = (order) => {
    setSelectedOrder(order);
    setCompleteForm({
      products: order.products || [],
      miscellaneousCost: order.miscellaneousCost || 0,
      discount: {
    type: order.discount.type, // default
    value: order.discount.value
  }

    });
    setOpenCompleteModal(true);
  };

  const handleCompleteChange = (e) => {
    const { name, value } = e.target;
    setCompleteForm({ ...completeForm, [name]: value });
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...completeForm.products];
    updatedProducts[index][field] = value;
    setCompleteForm({ ...completeForm, products: updatedProducts });
  };

  const addProduct = () => {
    setCompleteForm(prev => ({
      ...prev,
      products: [...prev.products, { product: '', quantity: 1 }]
    }));
  };

  // Form Validations
  const validateDraft = () => {
    const errors = {};
    if (!draftForm.TCRNumber?.trim()) errors.TCRNumber = 'TCR Number required';
    if (!draftForm.company) errors.company = 'Company required';
    if (!draftForm.technician) errors.technician = 'Technician required';

    if (!draftForm.customer.name?.trim()) errors['customer.name'] = 'Name required';
    if (!draftForm.customer.contact.phone?.trim()) errors['customer.contact.phone'] = 'Primary phone required';
    if (!draftForm.customer.address.pincode?.trim()) errors['customer.address.pincode'] = 'Pincode required';

    if (draftForm.customer.contact.phone && !/^\d{10}$/.test(draftForm.customer.contact.phone)) {
      errors['customer.contact.phone'] = 'Invalid phone number (10 digits required)';
    }

    if (draftForm.customer.address.pincode && !/^\d{6}$/.test(draftForm.customer.address.pincode)) {
      errors['customer.address.pincode'] = 'Invalid pincode (6 digits required)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateComplete = () => {
    const errors = {};
    // if (completeForm.products.length === 0) errors.products = 'At least one product required';
    if (completeForm.discountPercentage < 0 || completeForm.discountPercentage > 100) {
      errors.discountPercentage = 'Invalid discount percentage';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // API Actions
  const createDraftOrder = async (e) => {
    e.preventDefault();
    if (!validateDraft()) return;

    try {

      //console.log(draftForm);

      const response = await orderApi.createDraftOrder(draftForm);
      // const newOrder = response.data.data;

      // // Calculate total amount for the new order
      // const productTotal = newOrder.products.reduce((sum, product) => {
      //   return sum + (product.product?.price || 0) * (product.quantity || 0);
      // }, 0);

      // const installationCharge = newOrder.installationCharge || 0;
      // const miscellaneousCost = newOrder.miscellaneousCost || 0;
      // const discountPercentage = newOrder.discountPercentage || 0;

      // const subtotal = productTotal + installationCharge + miscellaneousCost;
      // const discountAmount = (subtotal * discountPercentage) / 100;
      // const total = subtotal - discountAmount;

      // // Format the new order to match the structure of existing orders
      // const formattedOrder = {
      //   ...newOrder,
      //   id: newOrder._id,
      //   companyName: newOrder.company?.name,
      //   technicianName: newOrder.technician?.name,
      //   customerName: newOrder.customer?.name,
      //   status: newOrder.status,
      //   TCRNumber: newOrder.TCRNumber,
      //   totalAmount: total
      // };

      // setOrders(prevOrders => [formattedOrder, ...prevOrders]);

      fetchData();
      handleClose();
    } catch (err) {
      setDraftError(
        err.response?.data?.error?.message || err.response?.data?.message ||
        'Failed to create draft order. Please try again.'
      );
    }
  };

  const updateDraftOrder = async (e) => {
    e.preventDefault();
    if (!validateDraft() || !selectedOrder) return;

    try {
      setLoading(true);
      const response = await orderApi.updateDraftOrder(selectedOrder.id, draftForm);
      // const updatedOrder = response.data.data;

      // // Calculate total amount for the updated order
      // const productTotal = updatedOrder.products.reduce((sum, product) => {
      //   return sum + (product.product?.price || 0) * (product.quantity || 0);
      // }, 0);

      // const installationCharge = updatedOrder.installationCharge || 0;
      // const miscellaneousCost = updatedOrder.miscellaneousCost || 0;
      // const discountPercentage = updatedOrder.discountPercentage || 0;

      // const subtotal = productTotal + installationCharge + miscellaneousCost;
      // const discountAmount = (subtotal * discountPercentage) / 100;
      // const total = subtotal - discountAmount;

      // // Format the updated order
      // const formattedOrder = {
      //   ...updatedOrder,
      //   id: updatedOrder._id,
      //   companyName: updatedOrder.company?.name,
      //   technicianName: updatedOrder.technician?.name,
      //   customerName: updatedOrder.customer?.name,
      //   status: updatedOrder.status,
      //   TCRNumber: updatedOrder.TCRNumber,
      //   totalAmount: total
      // };

      // setOrders(prevOrders =>
      //   prevOrders.map(o => o.id === selectedOrder.id ? formattedOrder : o)
      // );

      fetchData();

      handleClose();
    } catch (err) {
      setDraftError(
        err.response?.data?.error?.message || err.response?.data?.message ||
        'Failed to update draft order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const completeOrder = async (e) => {
    e.preventDefault();
    //console.log("before validate")
    if (!validateComplete()) return;
    //console.log("after validate")

    try {
      // const completionData = {
      //   ...completeForm,
      //   status: 'completed'
      // };
      
      const completionData = {
  products: completeForm.products,
  miscellaneousCost: completeForm.miscellaneousCost,
  fittingCost: completeForm.fittingCost,


discount: completeForm.discount,

  status: 'completed'
};

      
      const response = await orderApi.completeOrder(selectedOrder.id, completionData);
      // const updatedOrder = response.data.data;

      // // Calculate total amount for the completed order
      // const productTotal = updatedOrder.products.reduce((sum, product) => {
      //   return sum + (product.product?.price || 0) * (product.quantity || 0);
      // }, 0);

      // const installationCharge = updatedOrder.installationCharge || 0;
      // const miscellaneousCost = updatedOrder.miscellaneousCost || 0;
      // const discountPercentage = updatedOrder.discountPercentage || 0;

      // const subtotal = productTotal + installationCharge + miscellaneousCost;
      // const discountAmount = (subtotal * discountPercentage) / 100;
      // const total = subtotal - discountAmount;

      // // Format the completed order
      // const formattedOrder = {
      //   ...updatedOrder,
      //   id: updatedOrder._id,
      //   companyName: updatedOrder.company?.name,
      //   technicianName: updatedOrder.technician?.name,
      //   customerName: updatedOrder.customer?.name,
      //   status: updatedOrder.status,
      //   TCRNumber: updatedOrder.TCRNumber,
      //   totalAmount: total
      // };

      // setOrders(orders.map(o => o.id === selectedOrder.id ? formattedOrder : o));

      fetchData();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to complete order');
    }
  };


  const handleDeleteDraft = async (row) => {
  const confirmDelete = window.confirm(
    `Are you sure you want to delete Draft TCR: ${row.TCRNumber}?`
  );

  if (!confirmDelete) return;

  try {
    await orderApi.deleteDraft(row.id);

    // Remove from UI without refetch
    // setOrders(prev => prev.filter(item => item.id !== row.id));


    fetchData();

  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete draft order");
  }
};



  // DataGrid Columns
  const columns = [
    { field: 'TCRNumber', headerName: 'TCR', width: 130 },
    { field: 'companyName', headerName: 'Company', width: 180 },
    { field: 'technicianName', headerName: 'Technician', width: 180 },
    { field: 'customerName', headerName: 'Customer', width: 150 },
    { field: 'totalAmount', headerName: 'Total', width: 120, valueFormatter: (params) => `₹${params?.toFixed(2) || '0.00'}` },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'completed' ? 'success' :
              params.value === 'pending-approval' ? 'warning' :
                params.value === 'approved' ? 'primary' : 'info'
          }
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 400,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* View button - always visible */}
          <Tooltip title="View Order">
            <IconButton onClick={() => handleViewDraftOpen(params.row)} color="primary">
              <VisibilityIcon />
            </IconButton>
          </Tooltip>

          {/* Draft-specific actions */}
          {params.row.status === 'draft' && (
  <>
    <Tooltip title="Edit Draft">
      <IconButton onClick={() => handleEditDraftOpen(params.row)} color="primary">
        <EditIcon />
      </IconButton>
    </Tooltip>

    <Tooltip title="Complete Order">
      <IconButton onClick={() => handleCompleteOpen(params.row)} color="primary">
        <CheckCircleIcon />
      </IconButton>
    </Tooltip>

    {/* ✅ Delete Draft */}
    {user.role == "admin" && <Tooltip title="Delete Draft">
      <IconButton
        onClick={() => handleDeleteDraft(params.row)}
        color="error"
      >
        <DeleteIcon />
      </IconButton>
    </Tooltip>}
  </>
)}


          {/* Pending-approval actions */}
          {params.row.status === 'pending-approval' && (
            <>
              {/* <Tooltip title="Approve Discount">
                  <IconButton onClick={() => handleDiscountOpen(params.row)} color="success">
                    <AttachMoneyIcon />
                  </IconButton>
                </Tooltip> */}
              <Tooltip title="Approve Discount">
                <IconButton
                  onClick={() => handleDiscountOpen(params.row)}
                  color="success"
                  sx={{ ml: 1 }}
                >
                  <PercentIcon />
                </IconButton>
              </Tooltip>
              {user.role == "admin" && <Tooltip title="Delete Draft">
      <IconButton
        onClick={() => handleDeleteDraft(params.row)}
        color="error"
      >
        <DeleteIcon />
      </IconButton>
    </Tooltip>}
              {/* <Tooltip title="Approve Order">
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleApproveOrder(params.row.id)}
                  sx={{ ml: 1 }}
                >
                  Approve
                </Button>
              </Tooltip> */}
            </>
          )}
        </Box>
      )
    }
  ];

  // Modal Components
  const renderCreateModal = () => (
    <Modal open={openCreateModal} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>Create Draft Order</Typography>

        {draftError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {draftError}
          </Alert>
        )}

        <form onSubmit={createDraftOrder}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="TCR Number *"
                name="TCRNumber"
                value={draftForm.TCRNumber}
                onChange={handleDraftChange}
                error={!!formErrors.TCRNumber}
                helperText={formErrors.TCRNumber}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.company}>
                <InputLabel>Company *</InputLabel>
                <Select
                  name="company"
                  value={draftForm.company}
                  onChange={handleDraftChange}
                  label="Company *"
                >
                  {companies.map(company => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{formErrors.company}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={6} sm={6}>
              <FormControl fullWidth error={!!formErrors.technician}>
                <InputLabel>Technician *</InputLabel>
                <Select
                  name="technician"
                  value={draftForm.technician}
                  onChange={handleDraftChange}
                  label="Technician *"
                  disabled={!draftForm.company || loadingTechnicians}
                >
                  {loadingTechnicians ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : (
                    filteredTechnicians.map(tech => (
                      <MenuItem key={tech._id} value={tech._id}>
                        {tech.name}
                      </MenuItem>
                    ))
                  )}
                  {!loadingTechnicians && filteredTechnicians.length === 0 && (
                    <MenuItem disabled>
                      {draftForm.company ? "No technicians available" : "Select company first"}
                    </MenuItem>
                  )}
                </Select>
                <FormHelperText>{formErrors.technician}</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
  <FormControlLabel
    control={
      <Checkbox
        name="freeInstallation"
        checked={draftForm.freeInstallation}
        onChange={handleDraftChange}
      />
    }
    label="Free Installation"
  />
</Grid>


            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name *"
                    name="customer.name"
                    value={draftForm.customer.name}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.name']}
                    helperText={formErrors['customer.name']}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Primary Phone *"
                    name="customer.contact.phone"
                    value={draftForm.customer.contact.phone}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.contact.phone']}
                    helperText={formErrors['customer.contact.phone']}
                    inputProps={{ pattern: "[0-9]{10}" }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Alternate Phone"
                    name="customer.contact.alternatePhone"
                    value={draftForm.customer.contact.alternatePhone}
                    onChange={handleDraftChange}
                    inputProps={{ pattern: "[0-9]{10}" }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="customer.address.street"
                    value={draftForm.customer.address.street}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    name="customer.address.city"
                    value={draftForm.customer.address.city}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="State"
                    name="customer.address.state"
                    value={draftForm.customer.address.state}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Pincode *"
                    name="customer.address.pincode"
                    value={draftForm.customer.address.pincode}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.address.pincode']}
                    helperText={formErrors['customer.address.pincode']}
                    inputProps={{ pattern: "[0-9]{6}" }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth>
                Create Draft
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal open={openEditModal} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>Edit Draft Order</Typography>

        {draftError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {draftError}
          </Alert>
        )}

        <form onSubmit={updateDraftOrder}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="TCR Number *"
                name="TCRNumber"
                value={draftForm.TCRNumber}
                onChange={handleDraftChange}
                error={!!formErrors.TCRNumber}
                helperText={formErrors.TCRNumber}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.company}>
                <InputLabel>Company *</InputLabel>
                <Select
                  name="company"
                  value={draftForm.company}
                  onChange={handleDraftChange}
                  label="Company *"
                >
                  {companies.map(company => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{formErrors.company}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.technician}>
                <InputLabel>Technician *</InputLabel>
                <Select
                  name="technician"
                  value={draftForm.technician}
                  onChange={handleDraftChange}
                  label="Technician *"
                  disabled={!draftForm.company || loadingTechnicians}
                >
                  {loadingTechnicians ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : (
                    filteredTechnicians.map(tech => (
                      <MenuItem key={tech._id} value={tech._id}>
                        {tech.name}
                      </MenuItem>
                    ))
                  )}
                  {!loadingTechnicians && filteredTechnicians.length === 0 && (
                    <MenuItem disabled>
                      {draftForm.company ? "No technicians available" : "Select company first"}
                    </MenuItem>
                  )}
                </Select>
                <FormHelperText>{formErrors.technician}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={6}>
  <FormControlLabel
    control={
      <Checkbox
        name="freeInstallation"
        checked={draftForm.freeInstallation}
        onChange={handleDraftChange}
      />
    }
    label="Free Installation"
  />
</Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name *"
                    name="customer.name"
                    value={draftForm.customer.name}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.name']}
                    helperText={formErrors['customer.name']}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Primary Phone *"
                    name="customer.contact.phone"
                    value={draftForm.customer.contact.phone}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.contact.phone']}
                    helperText={formErrors['customer.contact.phone']}
                    inputProps={{ pattern: "[0-9]{10}" }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Alternate Phone"
                    name="customer.contact.alternatePhone"
                    value={draftForm.customer.contact.alternatePhone}
                    onChange={handleDraftChange}
                    inputProps={{ pattern: "[0-9]{10}" }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="customer.address.street"
                    value={draftForm.customer.address.street}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="City"
                    name="customer.address.city"
                    value={draftForm.customer.address.city}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="State"
                    name="customer.address.state"
                    value={draftForm.customer.address.state}
                    onChange={handleDraftChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Pincode *"
                    name="customer.address.pincode"
                    value={draftForm.customer.address.pincode}
                    onChange={handleDraftChange}
                    error={!!formErrors['customer.address.pincode']}
                    helperText={formErrors['customer.address.pincode']}
                    inputProps={{ pattern: "[0-9]{6}" }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth>
                Update Draft
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Modal>
  );

// const renderViewModal = () => {
//   if (!selectedOrder) return null;

//   /* ================= CALCULATIONS ================= */

//   const productTotal =
//     selectedOrder.products?.reduce(
//       (sum, item) =>
//         sum + (item.product?.price || 0) * (item.quantity || 0),
//       0
//     ) || 0;

//   const installationCharge = Number(selectedOrder.installationCharge) || 0;
//   const fittingCharge = Number(selectedOrder.fittingCost) || 0;
//   const miscCost = Number(selectedOrder.miscellaneousCost) || 0;

//   const productDiscountAmount =
//     (productTotal + installationCharge) *
//     ((selectedOrder.discountPercentage || 0) / 100);

//   const miscDiscountAmount =
//     miscCost *
//     ((selectedOrder.miscDiscountPercentage || 0) / 100);

//   const techProductDiscount =
//     productDiscountAmount *
//     ((selectedOrder.discountSplit?.technicianPercentage || 0) / 100);

//   const ownerProductDiscount =
//     productDiscountAmount *
//     ((selectedOrder.discountSplit?.ownerPercentage || 0) / 100);

//   const techMiscDiscount =
//     miscDiscountAmount *
//     ((selectedOrder.miscDiscountSplit?.technicianPercentage || 0) / 100);

//   const ownerMiscDiscount =
//     miscDiscountAmount *
//     ((selectedOrder.miscDiscountSplit?.ownerPercentage || 0) / 100);

//   const totalRevenue =
//     productTotal + installationCharge + miscCost + fittingCharge;

//   const totalDiscount =
//     productDiscountAmount + miscDiscountAmount;

//   const finalAmount = totalRevenue - totalDiscount;

//   /* ================= UI ================= */

//   return (
//     <Modal open={openViewModal} onClose={handleClose}>
//       <Box
//         sx={{
//           ...modalStyle,
//           maxHeight: "92vh",
//           overflowY: "auto",
//           p: 3
//         }}
//       >

//         {/* ================= HEADER ================= */}
//         <Box display="flex" justifyContent="space-between" mb={2}>
//           <Typography variant="h5" fontWeight="bold">
//             Order Overview
//           </Typography>
//           <IconButton onClick={handleClose}>
//             <CloseIcon />
//           </IconButton>
//         </Box>

//         <Grid container spacing={3}>

//           {/* ================= ORDER & CUSTOMER INFO ================= */}
// <Grid item xs={12}>
//   <Accordion defaultExpanded>
//     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
//       <Typography fontWeight="bold">
//         Order & Customer Details
//       </Typography>
//     </AccordionSummary>

//     <AccordionDetails>
//       <Grid container spacing={3}>

//         {/* ORDER INFO */}
//         <Grid item xs={12} md={6}>
//           <Typography fontWeight="600" mb={1}>
//             Order Info
//           </Typography>

//           <InfoRow label="TCR Number" value={selectedOrder.TCRNumber} />
//           <InfoRow label="Status" value={selectedOrder.status} />
//           <InfoRow label="Order Date"
//             value={new Date(selectedOrder.orderDate).toLocaleDateString()}
//           />
//           <InfoRow label="Free Installation"
//             value={selectedOrder.freeInstallation ? "Yes" : "No"}
//           />
//         </Grid>

//         {/* CUSTOMER INFO */}
//         <Grid item xs={12} md={6}>
//           <Typography fontWeight="600" mb={1}>
//             Customer Info
//           </Typography>

//           <InfoRow label="Name" value={selectedOrder.customer?.name} />
//           <InfoRow label="Phone" value={selectedOrder.customer?.contact?.phone} />
//           <InfoRow
//             label="Address"
//             value={`${selectedOrder.customer?.address?.street}, 
//             ${selectedOrder.customer?.address?.city}, 
//             ${selectedOrder.customer?.address?.state} - 
//             ${selectedOrder.customer?.address?.pincode}`}
//           />
//         </Grid>

//         {/* TECHNICIAN INFO */}
//         <Grid item xs={12} md={6}>
//           <Typography fontWeight="600" mb={1}>
//             Technician Info
//           </Typography>

//           <InfoRow label="Name" value={selectedOrder.technician?.name} />
//           <InfoRow label="Phone" value={selectedOrder.technician?.phone} />
//           <InfoRow label="Service Rate" value={`₹${selectedOrder.technician?.serviceRate}`} />
//           <InfoRow label="Misc. Share" value={`${selectedOrder.technician?.miscShare}%`} />

//         </Grid>

//         {/* COMPANY INFO */}
//         <Grid item xs={12} md={6}>
//           <Typography fontWeight="600" mb={1}>
//             Company Info
//           </Typography>

//           <InfoRow label="Company" value={selectedOrder.company?.name} />
//           <InfoRow label="Base Installation"
//             value={`₹${selectedOrder.company?.installationCharge}`}
//           />
//         </Grid>

//       </Grid>
//     </AccordionDetails>
//   </Accordion>
// </Grid>


//           {/* ================= PRODUCTS ================= */}
//           <Grid item xs={12}>
//             <Typography variant="h6">Products</Typography>
//             <Divider sx={{ mb: 1 }} />

//             {selectedOrder.products?.map((item, i) => (
//               <Box
//                 key={i}
//                 sx={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   py: 0.5
//                 }}
//               >
//                 <Typography>
//                   {item.product?.name} × {item.quantity}
//                 </Typography>
//                 <Typography fontWeight="500">
//                   ₹{(
//                     (item.product?.price || 0) * item.quantity
//                   ).toFixed(2)}
//                 </Typography>
//               </Box>
//             ))}

//             <Divider sx={{ my: 1 }} />

//             <Box display="flex" justifyContent="space-between">
//               <Typography fontWeight="bold">Product Total</Typography>
//               <Typography fontWeight="bold">
//                 ₹{productTotal.toFixed(2)}
//               </Typography>
//             </Box>
//           </Grid>

//           {/* ================= REVENUE BLOCK ================= */}
//           <Grid item xs={12} md={6}>
//             <Box sx={{ p: 2, bgcolor: "#f5f7fa", borderRadius: 2 }}>
//               <Typography fontWeight="bold" mb={1}>
//                 Revenue Breakdown
//               </Typography>

//               <FinanceRow label="Products" value={productTotal} />
//               <FinanceRow label="Installation" value={installationCharge} />
//               <FinanceRow label="Miscellaneous" value={miscCost} />
//               <FinanceRow label="Fitting (Tech Only)" value={fittingCharge} />

//               <Divider sx={{ my: 1 }} />

//               <FinanceRow
//                 label="Total Revenue"
//                 value={totalRevenue}
//                 bold
//               />
//             </Box>
//           </Grid>

//           {/* ================= DISCOUNT BLOCK ================= */}
//           <Grid item xs={12} md={6}>
//             <Box sx={{ p: 2, bgcolor: "#fff4f4", borderRadius: 2 }}>
//               <Typography fontWeight="bold" mb={1}>
//                 Discount Distribution
//               </Typography>

//               <FinanceRow
//                 label="Product Discount"
//                 value={-productDiscountAmount}
//               />
//               <FinanceRow
//                 label="Misc Discount"
//                 value={-miscDiscountAmount}
//               />

//               <Divider sx={{ my: 1 }} />

//               <Typography variant="body2" fontWeight="600">
//                 Technician Pays:
//               </Typography>
//               <FinanceRow
//                 label="Product Share"
//                 value={-techProductDiscount}
//               />
//               <FinanceRow
//                 label="Misc Share"
//                 value={-techMiscDiscount}
//               />

//               <Divider sx={{ my: 1 }} />

//               <Typography variant="body2" fontWeight="600">
//                 Owner Pays:
//               </Typography>
//               <FinanceRow
//                 label="Product Share"
//                 value={-ownerProductDiscount}
//               />
//               <FinanceRow
//                 label="Misc Share"
//                 value={-ownerMiscDiscount}
//               />
//             </Box>
//           </Grid>

//           {/* ================= FINAL SUMMARY ================= */}
//           <Grid item xs={12}>
//             <Box
//               sx={{
//                 p: 3,
//                 bgcolor: "#e8f5e9",
//                 borderRadius: 2
//               }}
//             >
//               <Typography variant="h6" fontWeight="bold" mb={1}>
//                 Final Settlement
//               </Typography>

//               <FinanceRow
//                 label="Final Amount After Discount"
//                 value={finalAmount}
//                 bold
//               />

//               <FinanceRow
//                 label="Technician Cut"
//                 value={selectedOrder.technicianCut}
//               />

//               <FinanceRow
//                 label="Company Cut"
//                 value={selectedOrder.companyCut}
//               />

//               {selectedOrder.outstandingAmount > 0 && (
//                 <FinanceRow
//                   label="Outstanding"
//                   value={selectedOrder.outstandingAmount}
//                   error
//                 />
//               )}
//             </Box>
//           </Grid>

//           {/* ================= CLOSE ================= */}
//           <Grid item xs={12} textAlign="right">
//             <Button variant="contained" onClick={handleClose}>
//               Close
//             </Button>
//           </Grid>

//         </Grid>
//       </Box>
//     </Modal>
//   );
// };


const renderViewModal = () => {
  if (!selectedOrder) return null;

  /* ================= CALCULATIONS ================= */

// Products ONLY
const productTotal =
  selectedOrder.products?.reduce(
    (sum, item) =>
      sum +
      (Number(item.salePrice ?? item.product?.price) || 0) *
      (Number(item.quantity) || 0),
    0
  ) || 0;

const installationCharge =
  Number(selectedOrder.installationCharge) || 0;

const fittingCharge =
  Number(selectedOrder.fittingCost) || 0;

const miscCost =
  Number(selectedOrder.miscellaneousCost) || 0;

const serviceRate =
  Number(selectedOrder.technician?.serviceRate) || 0;

/* ---- GROSS SUBTOTAL (EXACT BACKEND MATCH) ---- */
const grossSubtotal =
  productTotal +
  installationCharge +
  miscCost +
  fittingCharge;

/* ================= DISCOUNT ================= */

let totalDiscount = 0;
let discountLabel = "0";

if (selectedOrder.discount?.type === "percentage") {
  const pct = Math.max(
    0,
    Math.min(100, Number(selectedOrder.discount?.value) || 0)
  );

  totalDiscount = grossSubtotal * (pct / 100);
  discountLabel = `${pct}%`;
}

if (selectedOrder.discount?.type === "amount") {
  const amount = Number(selectedOrder.discount?.value) || 0;

  totalDiscount = Math.min(grossSubtotal, amount);
  discountLabel = `₹${amount}`;
}

/* ================= SPLIT ================= */

const technicianSharePercentage =
  Math.min(
    100,
    Math.max(
      0,
      Number(selectedOrder.discountSplit?.technicianPercentage) || 0
    )
  );

const ownerSharePercentage =
  100 - technicianSharePercentage;

const technicianDiscountShare =
  totalDiscount * (technicianSharePercentage / 100);

const ownerDiscountShare =
  totalDiscount * (ownerSharePercentage / 100);

const finalAmount = grossSubtotal - totalDiscount;


  /* ================= UI ================= */

  return (
    <Modal open={openViewModal} onClose={handleClose}>
      <Box
        sx={{
          ...modalStyle,
          maxHeight: "92vh",
          overflowY: "auto",
          p: 3
        }}
      >
        {/* ================= HEADER ================= */}
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Order Overview
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>

<Grid item xs={12}>
  <Accordion defaultExpanded>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography fontWeight="bold">
        Order & Customer Details
      </Typography>
    </AccordionSummary>

    <AccordionDetails>
      <Grid container spacing={3}>

        {/* ORDER INFO */}
        <Grid item xs={12} md={6}>
          <Typography fontWeight="600" mb={1}>
            Order Info
          </Typography>

          <InfoRow label="TCR Number" value={selectedOrder.TCRNumber} />
          <InfoRow label="Status" value={selectedOrder.status} />
          <InfoRow label="Order Date"
            value={new Date(selectedOrder.orderDate).toLocaleDateString()}
          />
          <InfoRow label="Free Installation"
            value={selectedOrder.freeInstallation ? "Yes" : "No"}
          />
        </Grid>

        {/* CUSTOMER INFO */}
        <Grid item xs={12} md={6}>
          <Typography fontWeight="600" mb={1}>
            Customer Info
          </Typography>

          <InfoRow label="Name" value={selectedOrder.customer?.name} />
          <InfoRow label="Phone" value={selectedOrder.customer?.contact?.phone} />
          <InfoRow
            label="Address"
            value={`${selectedOrder.customer?.address?.street}, 
            ${selectedOrder.customer?.address?.city}, 
            ${selectedOrder.customer?.address?.state} - 
            ${selectedOrder.customer?.address?.pincode}`}
          />
        </Grid>

        {/* TECHNICIAN INFO */}
        <Grid item xs={12} md={6}>
          <Typography fontWeight="600" mb={1}>
            Technician Info
          </Typography>

          <InfoRow label="Name" value={selectedOrder.technician?.name} />
          <InfoRow label="Phone" value={selectedOrder.technician?.phone} />
          <InfoRow label="Service Rate" value={`₹${selectedOrder.technician?.serviceRate}`} />
          <InfoRow label="Misc. Share" value={`${selectedOrder.technician?.miscShare}%`} />

        </Grid>

        {/* COMPANY INFO */}
        <Grid item xs={12} md={6}>
          <Typography fontWeight="600" mb={1}>
            Company Info
          </Typography>

          <InfoRow label="Company" value={selectedOrder.company?.name} />
          <InfoRow label="Base Installation"
            value={`₹${selectedOrder.company?.installationCharge}`}
          />
        </Grid>

      </Grid>
    </AccordionDetails>
  </Accordion>
</Grid>

          

          {/* ================= PRODUCTS ================= */}
          <Grid item xs={12}>
            <Typography variant="h6">Products</Typography>
            <Divider sx={{ mb: 1 }} />

            {selectedOrder.products?.map((item, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 0.5
                }}
              >
                <Typography>
                  {item.product?.name} × {item.quantity}
                </Typography>
                <Typography fontWeight="500">
                  ₹{(
                    (Number(item.salePrice || item.product?.price) || 0) *
                    (Number(item.quantity) || 0)
                  ).toFixed(2)}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1 }} />

            <Box display="flex" justifyContent="space-between">
              <Typography fontWeight="bold">Product Total</Typography>
              <Typography fontWeight="bold">
                ₹{productTotal.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          {/* ================= REVENUE BLOCK ================= */}
<Grid item xs={12} md={6}>
  <Box sx={{ p: 2, bgcolor: "#f5f7fa", borderRadius: 2 }}>
    <Typography fontWeight="bold" mb={1}>
      Revenue Breakdown
    </Typography>

    <FinanceRow label="Product Total" value={productTotal} />
    <FinanceRow label="Installation Charge" value={installationCharge} />
    <FinanceRow label="Miscellaneous Cost" value={miscCost} />
    <FinanceRow label="Fitting Cost" value={fittingCharge} />

    <Divider sx={{ my: 1 }} />

    <FinanceRow
      label="Gross Subtotal"
      value={grossSubtotal}
      bold
    />
  </Box>
</Grid>


          {/* ================= DISCOUNT BLOCK ================= */}
          {/* ================= DISCOUNT BLOCK ================= */}
<Grid item xs={12} md={6}>
  <Box sx={{ p: 2, bgcolor: "#fff4f4", borderRadius: 2 }}>
    <Typography fontWeight="bold" mb={1}>
      Discount Distribution
    </Typography>

    <FinanceRow
      label={`Overall Discount (${discountLabel})`}
      value={-totalDiscount}
      bold
    />

    <Divider sx={{ my: 1 }} />

    <Typography variant="body2" fontWeight="600">
      Technician Pays ({technicianSharePercentage}%)
    </Typography>
    <FinanceRow
      label="Technician Share"
      value={-technicianDiscountShare}
    />

    <Divider sx={{ my: 1 }} />

    <Typography variant="body2" fontWeight="600">
      Owner Pays ({ownerSharePercentage}%)
    </Typography>
    <FinanceRow
      label="Owner Share"
      value={-ownerDiscountShare}
    />
  </Box>
</Grid>


          {/* ================= FINAL SUMMARY ================= */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 3,
                bgcolor: "#e8f5e9",
                borderRadius: 2
              }}
            >
              <Typography variant="h6" fontWeight="bold" mb={1}>
                Final Settlement
              </Typography>

              <FinanceRow
                label="Final Amount After Discount"
                value={finalAmount}
                bold
              />

              <FinanceRow
                label="Technician Cut"
                value={selectedOrder.technicianCut}
              />

              <FinanceRow
                label="Company Cut"
                value={selectedOrder.companyCut}
              />

              {selectedOrder.outstandingAmount > 0 && (
                <FinanceRow
                  label="Outstanding"
                  value={selectedOrder.outstandingAmount}
                  error
                />
              )}
            </Box>
          </Grid>

          {/* ================= CLOSE ================= */}
          <Grid item xs={12} textAlign="right">
            <Button variant="contained" onClick={handleClose}>
              Close
            </Button>
          </Grid>

        </Grid>
      </Box>
    </Modal>
  );
};





  const renderCompleteModal = () => (
    <Modal open={openCompleteModal} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>Complete Order</Typography>
        <form onSubmit={completeOrder}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Products</Typography>
              {completeForm.products.map((product, index) => (
                <Grid container spacing={2} key={index} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Product</InputLabel>
                      <Select
                        value={product.product}
                        onChange={(e) => handleProductChange(index, 'product', e.target.value)}
                      >
                        {products.map(p => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.name} (₹{p.price})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                </Grid>
              ))}
              <Button onClick={addProduct} sx={{ mt: 2 }}>Add Product</Button>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Miscellaneous Costs (₹)"
                name="miscellaneousCost"
                type="number"
                value={completeForm.miscellaneousCost}
                onChange={handleCompleteChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fitting Cost (₹)"
                name="fittingCost"
                type="number"
                value={completeForm.fittingCost}
                onChange={handleCompleteChange}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>

            {/* <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount Percentage (%)"
                name="discountPercentage"
                type="number"
                value={completeForm.discountPercentage}
                onChange={handleCompleteChange}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                error={!!formErrors.discountPercentage}
                helperText={formErrors.discountPercentage}
              />
            </Grid> */}
  <Grid item xs={12} sm={6}>
  <FormControl fullWidth>
    <InputLabel>Discount Type</InputLabel>
    <Select
      value={completeForm.discount.type}
      label="Discount Type"
      onChange={(e) =>
        setCompleteForm((prev) => ({
          ...prev,
          discount: {
            ...prev.discount,
            type: e.target.value
          }
        }))
      }
    >
      <MenuItem value="percentage">Percentage (%)</MenuItem>
      <MenuItem value="amount">Fixed Amount (₹)</MenuItem>
    </Select>
  </FormControl>
</Grid>

<Grid item xs={12} sm={6}>
  <TextField
    fullWidth
    label={
      completeForm.discount.type === 'percentage'
        ? 'Discount (%)'
        : 'Discount Amount (₹)'
    }
    type="number"
    value={completeForm.discount.value}
    onChange={(e) =>
      setCompleteForm((prev) => ({
        ...prev,
        discount: {
          ...prev.discount,
          value: e.target.value
        }
      }))
    }
     InputProps={{
  startAdornment: (
    <InputAdornment position="start">
      {completeForm.discount.type === 'percentage' ? '%' : '₹'}
    </InputAdornment>
  ),
  inputProps:
    completeForm.discount.type === 'percentage'
      ? { min: 0, max: 100 }
      : { min: 0 }
}}






  />
</Grid>


            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth color="success">
                Complete Order
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
    </Modal>
  );


// const renderDiscountModal = () => {
//   if (!selectedOrder) return null;

//   /* -------------------- BASE AMOUNTS -------------------- */

//   const productsTotal = selectedOrder.products.reduce(
//     (sum, item) => sum + item.product.price * item.quantity,
//     0
//   );

//   const installationCharge = Number(selectedOrder.installationCharge || 0);
//   const miscellaneousCost = Number(selectedOrder.miscellaneousCost || 0);

//   /* -------------------- DISCOUNT BASES -------------------- */

//   // Discount applies to products + installation
//   const productDiscountBase = productsTotal + installationCharge;

//   // Misc discount applies ONLY to misc cost
//   const miscDiscountBase = miscellaneousCost;

//   /* -------------------- DISCOUNT PERCENTAGES -------------------- */

//   const productDiscountPercentage = Number(
//     selectedOrder.discountPercentage || 0
//   );

//   const miscDiscountPercentage = Number(
//     selectedOrder.miscDiscountPercentage || 0
//   );

//   /* -------------------- DISCOUNT AMOUNTS -------------------- */

//   const productDiscountAmount =
//     (productDiscountBase * productDiscountPercentage) / 100;

//   const miscDiscountAmount =
//     (miscDiscountBase * miscDiscountPercentage) / 100;

//   /* -------------------- SPLITS -------------------- */

//   const productSplit = selectedOrder.discountSplit || {
//     ownerPercentage: 100,
//     technicianPercentage: 0
//   };

//   const miscSplit = selectedOrder.miscDiscountSplit || {
//     ownerPercentage: 100,
//     technicianPercentage: 0
//   };

//   return (
//     <Modal open={openDiscountModal} onClose={() => setOpenDiscountModal(false)}>
//       <Box sx={modalStyle}>
//         {/* HEADER */}
//         <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
//           <Typography variant="h6">Discount Approval</Typography>
//           <IconButton onClick={() => setOpenDiscountModal(false)} size="small">
//             <CloseIcon />
//           </IconButton>
//         </Box>

//         {/* ---------------- PRODUCT DISCOUNT ---------------- */}
//         <Box sx={{ mt: 3 }}>
//           <Typography variant="subtitle1">
//             Product + Installation Discount
//           </Typography>

//           <Grid container justifyContent="space-between">
//             <Typography>{productDiscountPercentage}%</Typography>
//             <Typography>
//               {formatCurrency(productDiscountAmount)}
//             </Typography>
//           </Grid>

//           <Typography variant="caption">
//             Owner: {productSplit.ownerPercentage}% | Technician:{' '}
//             {productSplit.technicianPercentage}%
//           </Typography>

//           <Slider
//             value={productDiscountSplit.owner}
//             onChange={(e, val) =>
//               setProductDiscountSplit({
//                 owner: Number(val),
//                 technician: 100 - Number(val)
//               })
//             }
//             step={5}
//             min={0}
//             max={100}
//             valueLabelDisplay="auto"
//           />
//         </Box>

//         <Divider sx={{ my: 3 }} />

//         {/* ---------------- MISC DISCOUNT ---------------- */}
//         <Box>
//           <Typography variant="subtitle1">
//             Miscellaneous Discount
//           </Typography>

//           <Grid container justifyContent="space-between">
//             <Typography>{miscDiscountPercentage}%</Typography>
//             <Typography>
//               {formatCurrency(miscDiscountAmount)}
//             </Typography>
//           </Grid>

//           <Typography variant="caption">
//             Owner: {miscSplit.ownerPercentage}% | Technician:{' '}
//             {miscSplit.technicianPercentage}%
//           </Typography>

//           <Slider
//             value={miscDiscountSplit.owner}
//             onChange={(e, val) =>
//               setMiscDiscountSplit({
//                 owner: Number(val),
//                 technician: 100 - Number(val)
//               })
//             }
//             step={5}
//             min={0}
//             max={100}
//             valueLabelDisplay="auto"
//           />
//         </Box>

//         <Divider sx={{ my: 3 }} />

//         {/* INFO */}
//         <Typography variant="body2" color="text.secondary">
//           ℹ️ Service / fitting charges are fully credited to the technician and
//           are not discounted.
//         </Typography>

//         {/* ACTIONS */}
//         <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
//           <Button
//             variant="contained"
//             color="error"
//             onClick={handleRejectDiscount}
//             disabled={loading}
//           >
//             Reject Discount
//           </Button>

//           <Button
//             variant="contained"
//             color="success"
//             onClick={handleApproveDiscount}
//             disabled={loading}
//             startIcon={<CheckCircleIcon />}
//           >
//             Approve Distribution
//           </Button>
//         </Box>
//       </Box>
//     </Modal>
//   );
// };

const renderDiscountModal = () => {
  if (!selectedOrder) return null;

  /* ================= BACKEND MATCHED CALC ================= */

  const installationCharge =
    Number(selectedOrder.installationCharge) || 0;

  let productTotal = installationCharge;

  (selectedOrder.products || []).forEach(item => {
    const price =
      Number(item.salePrice ?? item.product?.price) || 0;
    const qty = Number(item.quantity) || 0;
    productTotal += price * qty;
  });

  const miscCost =
    Number(selectedOrder.miscellaneousCost) || 0;

  const fittingCharge =
    Number(selectedOrder.fittingCost) || 0;

  /* ❌ SERVICE RATE REMOVED FROM DISCOUNT BASE */
  const serviceRate =
    Number(selectedOrder.technician?.serviceRate) || 0;

  /* ---- GROSS SUBTOTAL (MATCH BACKEND EXACTLY) ---- */
  const grossSubtotal =
      productTotal
    + miscCost
    + fittingCharge;

  /* ================= DISCOUNT ================= */

  let discountAmount = 0;
  let discountLabel = "";

  if (selectedOrder.discount?.type === "percentage") {
    const pct = Math.max(
      0,
      Math.min(100, Number(selectedOrder.discount?.value) || 0)
    );

    discountAmount = grossSubtotal * (pct / 100);
    discountLabel = `${pct}%`;
  }

  if (selectedOrder.discount?.type === "amount") {
    discountAmount = Math.min(
      grossSubtotal,
      Number(selectedOrder.discount?.value) || 0
    );

    discountLabel = `₹${selectedOrder.discount?.value}`;
  }

  /* ================= SPLIT ================= */

  const split = selectedOrder.discountSplit || {
    ownerPercentage: 100,
    technicianPercentage: 0
  };

  const technicianDiscount =
    discountAmount *
    (Number(split.technicianPercentage) / 100);

  const ownerDiscount =
    discountAmount *
    (Number(split.ownerPercentage) / 100);

  const netAmount =
    grossSubtotal - discountAmount;

  return (
    <Modal
      open={openDiscountModal}
      onClose={() => setOpenDiscountModal(false)}
    >
      <Box sx={modalStyle}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6">
            Discount Approval
          </Typography>
          <IconButton
            onClick={() => setOpenDiscountModal(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* ================= DISCOUNT SUMMARY ================= */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">
            Discount Summary
          </Typography>

          <Grid container justifyContent="space-between">
            <Typography>Gross Subtotal</Typography>
            <Typography fontWeight="600">
              {formatCurrency(grossSubtotal)}
            </Typography>
          </Grid>

          <Grid container justifyContent="space-between">
            <Typography>
              Discount ({discountLabel})
            </Typography>
            <Typography color="error.main" fontWeight="600">
              -{formatCurrency(discountAmount)}
            </Typography>
          </Grid>

          <Grid container justifyContent="space-between">
            <Typography fontWeight="600">
              Net After Discount
            </Typography>
            <Typography fontWeight="600">
              {formatCurrency(netAmount)}
            </Typography>
          </Grid>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Applied to: Products + Installation + Misc + Fitting
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            Service charge (₹{serviceRate}) is NOT discounted
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* ================= SPLIT SECTION ================= */}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Discount Distribution
          </Typography>

          <Grid container justifyContent="space-between">
            <Typography fontWeight="bold">
              Owner ({split.ownerPercentage}%)
            </Typography>
            <Typography fontWeight="bold">
              Technician ({split.technicianPercentage}%)
            </Typography>
          </Grid>

          <Slider
            value={discountSplit.owner}
            onChange={(e, val) =>
              setDiscountSplit({
                owner: Number(val),
                technician: 100 - Number(val)
              })
            }
            step={5}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Technician absorbs {formatCurrency(technicianDiscount)} | 
            Owner absorbs {formatCurrency(ownerDiscount)}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* ================= ACTIONS ================= */}
        <Box
          sx={{
            mt: 4,
            display: "flex",
            justifyContent: "space-between"
          }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectDiscount}
            disabled={loading}
          >
            Reject Discount
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleApproveDiscount}
            disabled={loading}
            startIcon={<CheckCircleIcon />}
          >
            Approve Distribution
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};




const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [exportLoading, setExportLoading] = useState(false);


const isDateRangeValid = () => {
  if (!startDate || !endDate) return false;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffInDays = (end - start) / (1000 * 60 * 60 * 24);

  return diffInDays >= 0 && diffInDays <= 90;
};


const handleExport = async () => {
  if (!isDateRangeValid()) {
    alert("Date range must be within 90 days and valid.");
    return;
  }

  try {
    setExportLoading(true);

    const res = await orderApi.exportOrders({
      startDate,
      endDate,
    });

    // Create file from response
    const blob = new Blob([res.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Optional: dynamic filename with date range
    link.setAttribute(
      "download",
      `Orders_${startDate}_to_${endDate}.xlsx`
    );

    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error(error);
    alert("Export failed");
  } finally {
    setExportLoading(false);
  }
};





  return (
    <Box sx={{ width: '100%', p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Order Management</Typography>
        <Button
          variant="contained"
          onClick={handleDraftOpen}
        >
          New Draft Order
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      
      <Paper
  elevation={2}
  sx={{
    p: 2,
    mb: 3,
    borderRadius: 2,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2
  }}
>
  {/* Left Section */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
    <Typography variant="subtitle1" fontWeight={600}>
      Export Orders
    </Typography>

    <TextField
      type="date"
      label="Start Date"
      size="small"
      InputLabelProps={{ shrink: true }}
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />

    <TextField
      type="date"
      label="End Date"
      size="small"
      InputLabelProps={{ shrink: true }}
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      error={startDate && endDate && !isDateRangeValid()}
      helperText={
        startDate && endDate && !isDateRangeValid()
          ? "Maximum range is 90 days"
          : ""
      }
    />
  </Box>

  {/* Right Section */}
  <Button
    variant="contained"
    size="medium"
    onClick={handleExport}
    disabled={!isDateRangeValid() || exportLoading}
    sx={{
      minWidth: 140,
      fontWeight: 600
    }}
  >
    {exportLoading ? "Exporting..." : "Export Excel"}
  </Button>
</Paper>


      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DataGrid
          rows={orders}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          sx={{
            flex: 1,
            minHeight: 300,
            '& .MuiDataGrid-cell': {
              py: 1
            }
          }}
        />
      </Box>

      {renderCreateModal()}
      {renderEditModal()}
      {renderViewModal()}
      {renderCompleteModal()}
      {renderDiscountModal()}
    </Box>
  );
};

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', md: 600 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto'
};

const InfoRow = ({ label, value }) => (
  <Grid container spacing={1} sx={{ mb: 0.5 }}>
    <Grid item xs={4}>
      <Typography variant="body2">
        <strong>{label}:</strong>
      </Typography>
    </Grid>
    <Grid item xs={8}>
      <Typography variant="body2">
        {value ?? '—'}
      </Typography>
    </Grid>
  </Grid>
);

const SummaryRow = ({ label, value, bold = false, error = false }) => (
  <Grid container>
    <Grid item xs={9}>
      <Typography fontWeight={bold ? 'bold' : 'normal'}>
        {label}
      </Typography>
    </Grid>
    <Grid item xs={3} textAlign="right">
      <Typography
        fontWeight={bold ? 'bold' : 'normal'}
        color={error ? 'error' : 'inherit'}
      >
        ₹{Number(value || 0).toFixed(2)}
      </Typography>
    </Grid>
  </Grid>
);

const FinanceRow = ({ label, value, bold, error }) => (
  <Box display="flex" justifyContent="space-between" py={0.5}>
    <Typography
      fontWeight={bold ? "bold" : 400}
      color={error ? "error.main" : "text.primary"}
    >
      {label}
    </Typography>
    <Typography
      fontWeight={bold ? "bold" : 500}
      color={value < 0 ? "error.main" : error ? "error.main" : "text.primary"}
    >
      ₹{Number(value).toFixed(2)}
    </Typography>
  </Box>
);



export default OrderList;


