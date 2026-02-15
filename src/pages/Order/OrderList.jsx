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
  Paper
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

  //const [discountSplit, setDiscountSplit] = useState({ owner: 100, technician: 0 });

  const [productDiscountSplit, setProductDiscountSplit] = useState({
  owner: 100,
  technician: 0
});

const [miscDiscountSplit, setMiscDiscountSplit] = useState({
  owner: 100,
  technician: 0
});


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

  productDiscountPercentage: 0,
  miscDiscountPercentage: 0
});



  // Add this function to handle discount modal opening
  const handleDiscountOpen = (order) => {
    setSelectedOrder(order);
    // Initialize with 100% owner responsibility by default
    setProductDiscountSplit({ owner: 100, technician: 0 });
    setMiscDiscountSplit({ owner: 100, technician: 0 });

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
      // await orderApi.approveDiscount(selectedOrder.id, {
      //   ownerPercentage: discountSplit.owner,
      //   technicianPercentage: discountSplit.technician
      // });

      await orderApi.approveDiscount(selectedOrder.id, {
  productSplit: {
    ownerPercentage: productDiscountSplit.owner,
    technicianPercentage: productDiscountSplit.technician
  },
  miscSplit: {
    ownerPercentage: miscDiscountSplit.owner,
    technicianPercentage: miscDiscountSplit.technician
  }
});


      // Update local state
      // setOrders(prevOrders =>
      //   prevOrders.map(order =>
      //     order.id === selectedOrder.id
      //       ? {
      //         ...order,
      //         status: 'completed',
      //         discountApproved: 'approved'
      //       }
      //       : order
      //   )
      // );

      fetchData();

      setOpenDiscountModal(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to approve discount');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectDiscount = async () => {
    try {
      setLoading(true);
      await orderApi.rejectDiscount(selectedOrder.id);

      // // Update local state
      // setOrders(prevOrders =>
      //   prevOrders.map(order =>
      //     order.id === selectedOrder.id
      //       ? {
      //         ...order,
      //         discountApproved: 'rejected'
      //       }
      //       : order
      //   )
      // );

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
        companyId: draftForm.company
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
      productDiscountPercentage: order.discountPercentage,
  miscDiscountPercentage: order.miscDiscountPercentage

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


  productDiscountPercentage: completeForm.productDiscountPercentage,
  miscDiscountPercentage: completeForm.miscDiscountPercentage,

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

  // const renderViewModal = () => (
  //   <Modal open={openViewModal} onClose={handleClose}>
  //     <Box sx={modalStyle}>
  //       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  //         <Typography variant="h6">Order Details</Typography>
  //         <IconButton onClick={handleClose} size="small">
  //           <CloseIcon />
  //         </IconButton>
  //       </Box>

  //       {selectedOrder && (
  //         <Grid container spacing={2} sx={{ mt: 1 }}>
  //           <Grid item xs={12} md={6}>
  //             <Typography variant="subtitle2">Order Information</Typography>
  //             <Divider sx={{ my: 1 }} />
  //             <Grid container spacing={1}>
  //               <Grid item xs={4}><Typography variant="body2"><strong>TCR:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.TCRNumber}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Status:</strong></Typography></Grid>
  //               <Grid item xs={8}>
  //                 <Chip
  //                   label={selectedOrder.status}
  //                   color={
  //                     selectedOrder.status === 'completed' ? 'success' :
  //                       selectedOrder.status === 'pending-approval' ? 'warning' :
  //                         selectedOrder.status === 'approved' ? 'primary' : 'info'
  //                   }
  //                   size="small"
  //                 />
  //               </Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Company:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.companyName}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Technician:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.technicianName}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Installation:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>₹{selectedOrder.installationCharge?.toFixed(2) || '0.00'}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Total:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography variant="body1" fontWeight="bold">₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</Typography></Grid>
  //             </Grid>
  //           </Grid>

  //           <Grid item xs={12} md={6}>
  //             <Typography variant="subtitle2">Customer Information</Typography>
  //             <Divider sx={{ my: 1 }} />
  //             <Grid container spacing={1}>
  //               <Grid item xs={4}><Typography variant="body2"><strong>Name:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.customerName}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Phone:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.customer?.contact?.phone}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Alt Phone:</strong></Typography></Grid>
  //               <Grid item xs={8}><Typography>{selectedOrder.customer?.contact?.alternatePhone || 'N/A'}</Typography></Grid>

  //               <Grid item xs={4}><Typography variant="body2"><strong>Address:</strong></Typography></Grid>
  //               <Grid item xs={8}>
  //                 <Typography>
  //                   {selectedOrder.customer?.address?.street || 'N/A'},<br />
  //                   {selectedOrder.customer?.address?.city || 'N/A'},<br />
  //                   {selectedOrder.customer?.address?.state || 'N/A'} - {selectedOrder.customer?.address?.pincode}
  //                 </Typography>
  //               </Grid>
  //             </Grid>
  //           </Grid>

  //           {selectedOrder.products?.length > 0 && (
  //             <Grid item xs={12}>
  //               <Typography variant="subtitle2">Products</Typography>
  //               <Divider sx={{ my: 1 }} />
  //               <Grid container>
  //                 {selectedOrder.products.map((item, index) => (
  //                   <Grid container key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
  //                     <Grid item xs={7}>
  //                       <Typography>
  //                         {item.product?.name || 'Product'}
  //                         {item.product?.price && ` (₹${item.product.price})`}
  //                       </Typography>
  //                     </Grid>
  //                     <Grid item xs={2}>
  //                       <Typography>Qty: {item.quantity}</Typography>
  //                     </Grid>
  //                     <Grid item xs={3} textAlign="right">
  //                       <Typography>
  //                         ₹{(item.product?.price || 0) * (item.quantity || 0)}
  //                       </Typography>
  //                     </Grid>
  //                   </Grid>
  //                 ))}
  //               </Grid>
  //             </Grid>
  //           )}

  //           <Grid item xs={12}>
  //             <Typography variant="subtitle2">Financial Summary</Typography>
  //             <Divider sx={{ my: 1 }} />
  //             <Grid container>
  //               <Grid item xs={9}><Typography>Product Total:</Typography></Grid>
  //               <Grid item xs={3} textAlign="right">
  //                 <Typography>₹{selectedOrder.products?.reduce((sum, p) => sum + (p.product?.price || 0) * (p.quantity || 0), 0).toFixed(2)}</Typography>
  //               </Grid>

  //               <Grid item xs={9}><Typography>Installation Charge:</Typography></Grid>
  //               <Grid item xs={3} textAlign="right">
  //                 <Typography>₹{selectedOrder.installationCharge?.toFixed(2) || '0.00'}</Typography>
  //               </Grid>

  //               <Grid item xs={9}><Typography>Miscellaneous Costs:</Typography></Grid>
  //               <Grid item xs={3} textAlign="right">
  //                 <Typography>₹{selectedOrder.miscellaneousCost?.toFixed(2) || '0.00'}</Typography>
  //               </Grid>

  //               <Grid item xs={9}><Typography>Discount ({selectedOrder.discountPercentage || 0}%):</Typography></Grid>
  //               <Grid item xs={3} textAlign="right">
  //                 <Typography color="error">-₹{(
  //                   ((selectedOrder.products?.reduce((sum, p) => sum + (p.product?.price || 0) * (p.quantity || 0), 0)
  //                     + (selectedOrder.installationCharge || 0)
  //                     + (selectedOrder.miscellaneousCost || 0))
  //                     * (selectedOrder.discountPercentage || 0) / 100
  //                   ).toFixed(2))}</Typography>
  //               </Grid>

  //               <Grid item xs={9}><Typography variant="body1" fontWeight="bold">Total Amount:</Typography></Grid>
  //               <Grid item xs={3} textAlign="right">
  //                 <Typography variant="body1" fontWeight="bold">₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</Typography>
  //               </Grid>
  //             </Grid>
  //           </Grid>

  //           <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
  //             <Button variant="outlined" onClick={handleClose}>
  //               Close
  //             </Button>

  //             {selectedOrder.status === 'draft' && (
  //               <Button
  //                 variant="contained"
  //                 onClick={() => {
  //                   handleClose();
  //                   handleEditDraftOpen(selectedOrder);
  //                 }}
  //               >
  //                 Edit Order
  //               </Button>
  //             )}

  //             {selectedOrder.status === 'pending-approval' && (
  //               <Button
  //                 variant="contained"
  //                 color="success"
  //                 onClick={() => handleApproveOrder(selectedOrder.id)}
  //               >
  //                 Approve Order
  //               </Button>
  //             )}
  //           </Grid>
  //         </Grid>
  //       )}
  //     </Box>
  //   </Modal>
  // );

//   const renderViewModal = () => {
//   // Calculate discount amount
//   const discountAmount = selectedOrder ? 
//     calculateDiscountAmount(selectedOrder) : 
//     0;
  
//   return (
//     <Modal open={openViewModal} onClose={handleClose}>
//       <Box sx={modalStyle}>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <Typography variant="h6">Order Details</Typography>
//           <IconButton onClick={handleClose} size="small">
//             <CloseIcon />
//           </IconButton>
//         </Box>

//         {selectedOrder && (
//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2">Order Information</Typography>
//               <Divider sx={{ my: 1 }} />
//               <Grid container spacing={1}>
//                 <Grid item xs={4}><Typography variant="body2"><strong>TCR:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.TCRNumber}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Status:</strong></Typography></Grid>
//                 <Grid item xs={8}>
//                   <Chip
//                     label={selectedOrder.status}
//                     color={
//                       selectedOrder.status === 'completed' ? 'success' :
//                         selectedOrder.status === 'pending-approval' ? 'warning' :
//                           'info'
//                     }
//                     size="small"
//                   />
//                 </Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Company:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.companyName}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Technician:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.technicianName}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Installation:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>₹{selectedOrder.installationCharge?.toFixed(2) || '0.00'}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Total:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography variant="body1" fontWeight="bold">₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</Typography></Grid>
//               </Grid>
//             </Grid>

//             <Grid item xs={12} md={6}>
//               <Typography variant="subtitle2">Customer Information</Typography>
//               <Divider sx={{ my: 1 }} />
//               <Grid container spacing={1}>
//                 <Grid item xs={4}><Typography variant="body2"><strong>Name:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.customerName}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Phone:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.customer?.contact?.phone}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Alt Phone:</strong></Typography></Grid>
//                 <Grid item xs={8}><Typography>{selectedOrder.customer?.contact?.alternatePhone || 'N/A'}</Typography></Grid>

//                 <Grid item xs={4}><Typography variant="body2"><strong>Address:</strong></Typography></Grid>
//                 <Grid item xs={8}>
//                   <Typography>
//                     {selectedOrder.customer?.address?.street || 'N/A'},<br />
//                     {selectedOrder.customer?.address?.city || 'N/A'},<br />
//                     {selectedOrder.customer?.address?.state || 'N/A'} - {selectedOrder.customer?.address?.pincode}
//                   </Typography>
//                 </Grid>
//               </Grid>
//             </Grid>

//             {selectedOrder.products?.length > 0 && (
//               <Grid item xs={12}>
//                 <Typography variant="subtitle2">Products</Typography>
//                 <Divider sx={{ my: 1 }} />
//                 <Grid container>
//                   {selectedOrder.products.map((item, index) => (
//                     <Grid container key={index} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
//                       <Grid item xs={7}>
//                         <Typography>
//                           {item.product?.name || 'Product'}
//                           {item.product?.price && ` (₹${item.product.price})`}
//                         </Typography>
//                       </Grid>
//                       <Grid item xs={2}>
//                         <Typography>Qty: {item.quantity}</Typography>
//                       </Grid>
//                       <Grid item xs={3} textAlign="right">
//                         <Typography>
//                           ₹{(item.product?.price || 0) * (item.quantity || 0)}
//                         </Typography>
//                       </Grid>
//                     </Grid>
//                   ))}
//                 </Grid>
//               </Grid>
//             )}

//             {/* Discount Distribution Section */}
//             {selectedOrder.discountPercentage > 0 && (
//               <Grid item xs={12}>
//                 <Typography variant="subtitle2">Discount Details</Typography>
//                 <Divider sx={{ my: 1 }} />
//                 <Grid container spacing={1}>
//                   <Grid item xs={12} sm={4}>
//                     <Typography variant="body2">
//                       <strong>Discount Percentage:</strong> {selectedOrder.discountPercentage}%
//                     </Typography>
//                   </Grid>
//                   <Grid item xs={12} sm={4}>
//                     <Typography variant="body2">
//                       <strong>Discount Amount:</strong> ₹{discountAmount.toFixed(2)}
//                     </Typography>
//                   </Grid>
                  
//                   {selectedOrder.discountApproved === 'approved' && selectedOrder.discountSplit && (
//                     <>
//                       <Grid item xs={12} sm={4}>
//                         <Typography variant="body2">
//                           <strong>Status:</strong> Approved
//                         </Typography>
//                       </Grid>
//                       <Grid item xs={12} sm={4}>
//                         <Typography variant="body2">
//                           <strong>Owner Responsibility:</strong> {selectedOrder.discountSplit.ownerPercentage}%
//                         </Typography>
//                       </Grid>
//                       <Grid item xs={12} sm={4}>
//                         <Typography variant="body2">
//                           <strong>Technician Responsibility:</strong> {selectedOrder.discountSplit.technicianPercentage}%
//                         </Typography>
//                       </Grid>
//                       <Grid item xs={12} sm={4}>
//                         <Typography variant="body2">
//                           <strong>Technician Liability:</strong> ₹{(discountAmount * (selectedOrder.discountSplit.technicianPercentage / 100)).toFixed(2)}
//                         </Typography>
//                       </Grid>
//                     </>
//                   )}
                  
//                   {selectedOrder.discountApproved === 'rejected' && (
//                     <Grid item xs={12}>
//                       <Typography variant="body2" color="error">
//                         <strong>Status:</strong> Rejected
//                       </Typography>
//                     </Grid>
//                   )}
                  
//                   {selectedOrder.discountApproved === 'pending' && (
//                     <Grid item xs={12}>
//                       <Typography variant="body2" color="warning">
//                         <strong>Status:</strong> Pending Approval
//                       </Typography>
//                     </Grid>
//                   )}
//                 </Grid>
//               </Grid>
//             )}

//             <Grid item xs={12}>
//               <Typography variant="subtitle2">Financial Summary</Typography>
//               <Divider sx={{ my: 1 }} />
//               <Grid container>
//                 <Grid item xs={9}><Typography>Product Total:</Typography></Grid>
//                 <Grid item xs={3} textAlign="right">
//                   <Typography>₹{selectedOrder.products?.reduce((sum, p) => sum + (p.product?.price || 0) * (p.quantity || 0), 0).toFixed(2)}</Typography>
//                 </Grid>

//                 <Grid item xs={9}><Typography>Installation Charge:</Typography></Grid>
//                 <Grid item xs={3} textAlign="right">
//                   <Typography>₹{selectedOrder.installationCharge?.toFixed(2) || '0.00'}</Typography>
//                 </Grid>

//                 <Grid item xs={9}><Typography>Miscellaneous Costs:</Typography></Grid>
//                 <Grid item xs={3} textAlign="right">
//                   <Typography>₹{selectedOrder.miscellaneousCost?.toFixed(2) || '0.00'}</Typography>
//                 </Grid>

//                 {selectedOrder.discountPercentage > 0 && (
//                   <>
//                     <Grid item xs={9}><Typography>Discount ({selectedOrder.discountPercentage || 0}%):</Typography></Grid>
//                     <Grid item xs={3} textAlign="right">
//                       <Typography color="error">-₹{discountAmount.toFixed(2)}</Typography>
//                     </Grid>
//                   </>
//                 )}

//                 <Grid item xs={9}><Typography variant="body1" fontWeight="bold">Total Amount:</Typography></Grid>
//                 <Grid item xs={3} textAlign="right">
//                   <Typography variant="body1" fontWeight="bold">₹{selectedOrder.totalAmount?.toFixed(2) || '0.00'}</Typography>
//                 </Grid>

//                 {selectedOrder.technicianCut !== undefined && (
//                   <>
//                     <Grid item xs={9}><Typography>Technician's Cut:</Typography></Grid>
//                     <Grid item xs={3} textAlign="right">
//                       <Typography color={selectedOrder.technicianCut < 0 ? "error" : "inherit"}>
//                         ₹{selectedOrder.technicianCut?.toFixed(2) || '0.00'}
//                       </Typography>
//                     </Grid>
//                   </>
//                 )}

//                 {selectedOrder.outstandingAmount !== undefined && selectedOrder.outstandingAmount > 0 && (
//                   <>
//                     <Grid item xs={9}><Typography>Outstanding Amount:</Typography></Grid>
//                     <Grid item xs={3} textAlign="right">
//                       <Typography color="error" fontWeight="bold">
//                         ₹{selectedOrder.outstandingAmount?.toFixed(2)}
//                       </Typography>
//                     </Grid>
//                   </>
//                 )}
//               </Grid>
//             </Grid>

//             <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
//               <Button variant="outlined" onClick={handleClose}>
//                 Close
//               </Button>

//               {selectedOrder.status === 'draft' && (
//                 <Button
//                   variant="contained"
//                   onClick={() => {
//                     handleClose();
//                     handleEditDraftOpen(selectedOrder);
//                   }}
//                 >
//                   Edit Order
//                 </Button>
//               )}

//               {/* {selectedOrder.status === 'pending-approval' && (
//                 <Button
//                   variant="contained"
//                   color="success"
//                   onClick={() => handleApproveOrder(selectedOrder.id)}
//                 >
//                   Approve Order
//                 </Button>
//               )} */}
//             </Grid>
//           </Grid>
//         )}
//       </Box>
//     </Modal>
//   );
// };

const renderViewModal = () => {
  if (!selectedOrder) return null;

  /* -------------------- CALCULATIONS -------------------- */

  const productTotal =
    selectedOrder.products?.reduce(
      (sum, item) =>
        sum + (item.product?.price || 0) * (item.quantity || 0),
      0
    ) || 0;

  const installationCharge = Number(selectedOrder.installationCharge) || 0;
  const fittingCharge = Number(selectedOrder.fittingCost) || 0;
  const miscCost = Number(selectedOrder.miscellaneousCost) || 0;

  const productDiscountAmount =
    (productTotal + installationCharge) * ((selectedOrder.discountPercentage || 0) / 100);

  const miscDiscountAmount =
    miscCost * ((selectedOrder.miscDiscountPercentage || 0) / 100);

  const techProductDiscount =
    productDiscountAmount *
    ((selectedOrder.discountSplit?.technicianPercentage || 0) / 100);

  const techMiscDiscount =
    miscDiscountAmount *
    ((selectedOrder.miscDiscountSplit?.technicianPercentage || 0) / 100);

  /* -------------------- RENDER -------------------- */

  return (
    <Modal open={openViewModal} onClose={handleClose}>
      <Box
        sx={{
          ...modalStyle,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* ================= HEADER ================= */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Order Details</Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <Box sx={{ mt: 2, overflowY: 'auto', pr: 1 }}>
          <Grid container spacing={3}>

            {/* ================= ORDER INFO ================= */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Order Information</Typography>
              <Divider sx={{ my: 1 }} />

              <InfoRow label="TCR" value={selectedOrder.TCRNumber} />
              <InfoRow
                label="Status"
                value={
                  <Chip
                    label={selectedOrder.status}
                    size="small"
                    color={
                      selectedOrder.status === 'completed'
                        ? 'success'
                        : selectedOrder.status === 'pending-approval'
                        ? 'warning'
                        : 'info'
                    }
                  />
                }
              />
              <InfoRow label="Company" value={selectedOrder.companyName} />
              <InfoRow label="Technician" value={selectedOrder.technicianName} />
              <InfoRow
                label="Installation"
                value={`₹${installationCharge.toFixed(2)}`}
              />
              <InfoRow
                label="Free"
                value={`${selectedOrder.freeInstallation ? "Yes" : "No"}`}
              />
              <InfoRow
                label="Fitting"
                value={
                  <>
                    ₹{fittingCharge.toFixed(2)}{' '}
                    <Typography
                      component="span"
                      variant="caption"
                      color="success.main"
                    >
                      (100% Technician)
                    </Typography>
                  </>
                }
              />
            </Grid>

            {/* ================= CUSTOMER INFO ================= */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Customer Information</Typography>
              <Divider sx={{ my: 1 }} />

              <InfoRow label="Name" value={selectedOrder.customerName} />
              <InfoRow
                label="Phone"
                value={selectedOrder.customer?.contact?.phone}
              />
              <InfoRow
                label="Alt Phone"
                value={
                  selectedOrder.customer?.contact?.alternatePhone || 'N/A'
                }
              />
              <InfoRow
                label="Address"
                value={
                  <>
                    {selectedOrder.customer?.address?.street}
                    <br />
                    {selectedOrder.customer?.address?.city},{' '}
                    {selectedOrder.customer?.address?.state} -{' '}
                    {selectedOrder.customer?.address?.pincode}
                  </>
                }
              />
            </Grid>

            {/* ================= PRODUCTS ================= */}
            {selectedOrder.products?.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2">Products</Typography>
                <Divider sx={{ my: 1 }} />

                {selectedOrder.products.map((item, idx) => (
                  <Grid container key={idx} sx={{ py: 1 }}>
                    <Grid item xs={6}>
                      <Typography>{item.product?.name}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography>Qty: {item.quantity}</Typography>
                    </Grid>
                    <Grid item xs={3} textAlign="right">
                      <Typography>
                        ₹
                        {(
                          (item.product?.price || 0) * item.quantity
                        ).toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* ================= DISCOUNTS ================= */}
            {(productDiscountAmount > 0 || miscDiscountAmount > 0) && (
              <Grid item xs={12}>
                <Typography variant="subtitle2">Discount Details</Typography>
                <Divider sx={{ my: 1 }} />

                {productDiscountAmount > 0 && (
                  <>
                    <Typography fontWeight="bold">
                      Product Discount
                    </Typography>
                    <InfoRow
                      label="Percentage"
                      value={`${selectedOrder.discountPercentage}%`}
                    />
                    <InfoRow
                      label="Amount"
                      value={`₹${productDiscountAmount.toFixed(2)}`}
                    />
                    <InfoRow
                      label="Technician Share"
                      value={`₹${techProductDiscount.toFixed(2)}`}
                    />
                  </>
                )}

                {miscDiscountAmount > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography fontWeight="bold">
                      Miscellaneous Discount
                    </Typography>
                    <InfoRow
                      label="Percentage"
                      value={`${selectedOrder.miscDiscountPercentage}%`}
                    />
                    <InfoRow
                      label="Amount"
                      value={`₹${miscDiscountAmount.toFixed(2)}`}
                    />
                    <InfoRow
                      label="Technician Share"
                      value={`₹${techMiscDiscount.toFixed(2)}`}
                    />
                  </>
                )}

                <Divider sx={{ my: 1 }} />
                <Typography
                  color={
                    selectedOrder.discountApproved === 'approved'
                      ? 'success.main'
                      : selectedOrder.discountApproved === 'rejected'
                      ? 'error.main'
                      : 'warning.main'
                  }
                >
                  Status: {selectedOrder.discountApproved}
                </Typography>
              </Grid>
            )}

            {/* ================= FINANCIAL SUMMARY ================= */}
            <Grid item xs={12}>
              <Typography variant="subtitle2">Financial Summary</Typography>
              <Divider sx={{ my: 1 }} />

              <SummaryRow label="Product Total" value={productTotal} />
              <SummaryRow label="Installation" value={installationCharge} />
              <SummaryRow label="Fitting (Tech Only)" value={fittingCharge} />
              <SummaryRow label="Misc Cost" value={miscCost} />

              {productDiscountAmount > 0 && (
                <SummaryRow
                  label="Product Discount"
                  value={-productDiscountAmount}
                />
              )}

              {miscDiscountAmount > 0 && (
                <SummaryRow
                  label="Misc Discount"
                  value={-miscDiscountAmount}
                />
              )}

              <Divider sx={{ my: 1 }} />
              <SummaryRow
                label="Net Amount"
                value={selectedOrder.netAmount}
                bold
              />
              <SummaryRow
                label="Technician Cut"
                value={selectedOrder.technicianCut}
              />

              {selectedOrder.outstandingAmount > 0 && (
                <SummaryRow
                  label="Outstanding"
                  value={selectedOrder.outstandingAmount}
                  error
                />
              )}
            </Grid>

            {/* ================= ACTIONS ================= */}
            <Grid
              item
              xs={12}
              sx={{ display: 'flex', justifyContent: 'flex-end' }}
            >
              <Button variant="outlined" onClick={handleClose}>
                Close
              </Button>
            </Grid>
          </Grid>
        </Box>
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
            <TextField
  fullWidth
  label="Product Discount (%)"
  name="productDiscountPercentage"
  type="number"
  value={completeForm.productDiscountPercentage}
  onChange={handleCompleteChange}
  InputProps={{ inputProps: { min: 0, max: 100 } }}
/>
</Grid>
<Grid item xs={12} sm={6}>
<TextField
  fullWidth
  label="Misc Discount (%)"
  name="miscDiscountPercentage"
  type="number"
  value={completeForm.miscDiscountPercentage}
  onChange={handleCompleteChange}
  InputProps={{ inputProps: { min: 0, max: 100 } }}
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

  // Add this modal for discount approval
//   const renderDiscountModal = () => {
//     // Calculate discount amount
//     const discountAmount = selectedOrder ? calculateDiscountAmount(selectedOrder) : 0;

//     return <Modal open={openDiscountModal} onClose={() => setOpenDiscountModal(false)}>
//       <Box sx={modalStyle}>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//           <Typography variant="h6">Discount Approval</Typography>
//           <IconButton onClick={() => setOpenDiscountModal(false)} size="small">
//             <CloseIcon />
//           </IconButton>
//         </Box>

//         {selectedOrder && (
//           <>
//             <Box sx={{ mt: 3, mb: 2 }}>
//               <Grid container justifyContent="space-between">
//                 <Grid item>
//                   <Typography variant="body1">
//                     <strong>Discount:</strong> {selectedOrder?.discountPercentage || 0}%
//                   </Typography>
//                 </Grid>
//                 <Grid item>
//                   <Typography variant="body1">
//                     <strong>Amount:</strong> ₹{discountAmount.toFixed(2)}
//                   </Typography>
//                 </Grid>
//               </Grid>
//             </Box>

//             <Divider sx={{ my: 2 }} />

//             {/* <Typography variant="subtitle1" gutterBottom>
//               Responsibility Distribution
//             </Typography>

//             <Box sx={{ px: 2, py: 3, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
//               <Grid container spacing={2} alignItems="center">
//                 <Grid item xs={3}>
//                   <Typography variant="body2" color="primary">
//                     Owner: {discountSplit.owner}%
//                   </Typography>
//                 </Grid>
//                 <Grid item xs={6}>
//                   <Slider
//                     value={discountSplit.owner}
//                     onChange={handleDiscountSplitChange}
//                     aria-labelledby="discount-split-slider"
//                     valueLabelDisplay="auto"
//                     step={5}
//                     marks
//                     min={0}
//                     max={100}
//                   />
//                 </Grid>
//                 <Grid item xs={3} textAlign="right">
//                   <Typography variant="body2" color="secondary">
//                     Technician: {discountSplit.technician}%
//                   </Typography>
//                 </Grid>
//               </Grid>
//             </Box> */}

//             <Typography variant="subtitle2">Product Discount Split</Typography>
// <Slider
//   value={productDiscountSplit.owner}
//   onChange={(e, val) =>
//     setProductDiscountSplit({ owner: val, technician: 100 - val })
//   }
// />

// <Typography variant="subtitle2" sx={{ mt: 2 }}>
//   Misc Discount Split
// </Typography>
// <Slider
//   value={miscDiscountSplit.owner}
//   onChange={(e, val) =>
//     setMiscDiscountSplit({ owner: val, technician: 100 - val })
//   }
// />



//             <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
//               <Button
//                 variant="contained"
//                 color="error"
//                 onClick={handleRejectDiscount}
//                 disabled={loading}
//               >
//                 Reject Discount
//               </Button>

//               <Button
//                 variant="contained"
//                 color="success"
//                 onClick={handleApproveDiscount}
//                 disabled={loading}
//                 startIcon={<CheckCircleIcon />}
//               >
//                 Approve Distribution
//               </Button>
//             </Box>
//           </>
//         )}
//       </Box>
//     </Modal>
//   };

const renderDiscountModal = () => {
  if (!selectedOrder) return null;

  /* -------------------- BASE AMOUNTS -------------------- */

  const productsTotal = selectedOrder.products.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const installationCharge = Number(selectedOrder.installationCharge || 0);
  const miscellaneousCost = Number(selectedOrder.miscellaneousCost || 0);

  /* -------------------- DISCOUNT BASES -------------------- */

  // Discount applies to products + installation
  const productDiscountBase = productsTotal + installationCharge;

  // Misc discount applies ONLY to misc cost
  const miscDiscountBase = miscellaneousCost;

  /* -------------------- DISCOUNT PERCENTAGES -------------------- */

  const productDiscountPercentage = Number(
    selectedOrder.discountPercentage || 0
  );

  const miscDiscountPercentage = Number(
    selectedOrder.miscDiscountPercentage || 0
  );

  /* -------------------- DISCOUNT AMOUNTS -------------------- */

  const productDiscountAmount =
    (productDiscountBase * productDiscountPercentage) / 100;

  const miscDiscountAmount =
    (miscDiscountBase * miscDiscountPercentage) / 100;

  /* -------------------- SPLITS -------------------- */

  const productSplit = selectedOrder.discountSplit || {
    ownerPercentage: 100,
    technicianPercentage: 0
  };

  const miscSplit = selectedOrder.miscDiscountSplit || {
    ownerPercentage: 100,
    technicianPercentage: 0
  };

  return (
    <Modal open={openDiscountModal} onClose={() => setOpenDiscountModal(false)}>
      <Box sx={modalStyle}>
        {/* HEADER */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Discount Approval</Typography>
          <IconButton onClick={() => setOpenDiscountModal(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* ---------------- PRODUCT DISCOUNT ---------------- */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">
            Product + Installation Discount
          </Typography>

          <Grid container justifyContent="space-between">
            <Typography>{productDiscountPercentage}%</Typography>
            <Typography>
              {formatCurrency(productDiscountAmount)}
            </Typography>
          </Grid>

          <Typography variant="caption">
            Owner: {productSplit.ownerPercentage}% | Technician:{' '}
            {productSplit.technicianPercentage}%
          </Typography>

          <Slider
            value={productDiscountSplit.owner}
            onChange={(e, val) =>
              setProductDiscountSplit({
                owner: Number(val),
                technician: 100 - Number(val)
              })
            }
            step={5}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* ---------------- MISC DISCOUNT ---------------- */}
        <Box>
          <Typography variant="subtitle1">
            Miscellaneous Discount
          </Typography>

          <Grid container justifyContent="space-between">
            <Typography>{miscDiscountPercentage}%</Typography>
            <Typography>
              {formatCurrency(miscDiscountAmount)}
            </Typography>
          </Grid>

          <Typography variant="caption">
            Owner: {miscSplit.ownerPercentage}% | Technician:{' '}
            {miscSplit.technicianPercentage}%
          </Typography>

          <Slider
            value={miscDiscountSplit.owner}
            onChange={(e, val) =>
              setMiscDiscountSplit({
                owner: Number(val),
                technician: 100 - Number(val)
              })
            }
            step={5}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* INFO */}
        <Typography variant="body2" color="text.secondary">
          ℹ️ Service / fitting charges are fully credited to the technician and
          are not discounted.
        </Typography>

        {/* ACTIONS */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
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


export default OrderList;


