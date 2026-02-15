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
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  OutlinedInput,
  MenuItem,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import inventoryApi from '../../api/inventory';
import productApi from '../../api/product';
import technicianApi from '../../api/technician';

const InventoryList = () => {
  const { user } = useAuth();
  const [allocationLogs, setAllocationLogs] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });
  const [openModal, setOpenModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    productId: '',
    technicianId: '',
    quantity: 0,
  });

  // Fetch allocation logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize,
        };
        const res = await inventoryApi.getAllocationLogs(params);
        //console.log("res:", res);
        //console.log("res.data.data.map((log) => ({ ...log, id: log._id, productName: log.product.name, technicianName: log.technician.name })):", res.data.data.map((log) => ({ ...log, id: log._id, productName: log.product.name, technicianName: log.technician.name })));
        setAllocationLogs(res.data.data.map((log) => ({ ...log, id: log._id, productName: log.product.name, technicianName: log.technician.name })));
        setTotalRows(res.data.pagination.total);
      } catch (err) {
        setError('Failed to load allocation logs');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [paginationModel]);

  // Fetch products and technicians for allocation form
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const [productsRes, techniciansRes] = await Promise.all([
          productApi.getProducts(),
          technicianApi.getTechnicians(),
        ]);
        setProducts(productsRes.data.data);
        setTechnicians(techniciansRes.data.data);
      } catch (err) {
        setError('Failed to load resources');
      }
    };
    fetchResources();
  }, []);

  const handleOpenModal = () => {
    setFormData({ productId: '', technicianId: '', quantity: 0 });
    setFormErrors({});
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setError('');
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormErrors({ ...formErrors, [name]: null });
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.productId) {
      errors.productId = 'Product is required';
    }

    if (!formData.technicianId) {
      errors.technicianId = 'Technician is required';
    }

    const selectedProduct = products.find((p) => p._id === formData.productId);
    if (selectedProduct) {
      const availableQuantity =
        selectedProduct.totalCount - selectedProduct.allocatedCount;
      if (formData.quantity > availableQuantity || formData.quantity <= 0) {
        errors.quantity = `Quantity must be between 1 and ${availableQuantity}`;
      }
    } else {
      errors.quantity = 'Invalid product selection';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await inventoryApi.createAllocation(formData);
      handleCloseModal();

      // Refresh allocation logs
      const res = await inventoryApi.getAllocationLogs({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      });
      setAllocationLogs(res.data.data.map((log) => ({ ...log, id: log._id, productName: log.product.name, technicianName: log.technician.name })));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create allocation');
    }
  };

  const columns = [
    { field: 'productName', headerName: 'Product', width: 200 },
    { field: 'technicianName', headerName: 'Technician', width: 200 },
    { field: 'quantity', headerName: 'Quantity', width: 150 },
    { field: 'createdAt', headerName: 'Date', width: 200, valueFormatter: (params) => new Date(params).toLocaleDateString() },
  ];

  const renderFormFields = () => (
    <Grid container spacing={2}>
      {/* Product Selection */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!formErrors.productId}>
          <InputLabel>Product*</InputLabel>
          <Select
            name="productId"
            value={formData.productId}
            onChange={handleChange}
            renderValue={(selected) => {
              const selectedProduct = products.find((p) => p._id === selected);
              return selectedProduct ? selectedProduct.name : '';
            }}
          >
            {products?.map((product) => (
              <MenuItem key={product._id} value={product._id}>
                {product.name} (Available: {product.totalCount - product.allocatedCount})
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{formErrors.productId}</FormHelperText>
        </FormControl>
      </Grid>

      {/* Technician Selection */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!formErrors.technicianId}>
          <InputLabel>Technician*</InputLabel>
          <Select
            name="technicianId"
            value={formData.technicianId}
            onChange={handleChange}
            renderValue={(selected) => {
              const selectedTechnician = technicians.find((t) => t._id === selected);
              return selectedTechnician ? selectedTechnician.name : '';
            }}
          >
            {technicians?.map((technician) => (
              <MenuItem key={technician._id} value={technician._id}>
                {technician.name}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{formErrors.technicianId}</FormHelperText>
        </FormControl>
      </Grid>

      {/* Quantity Input */}
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!formErrors.quantity}>
          <InputLabel>Quantity*</InputLabel>
          <OutlinedInput
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            inputProps={{ min: 1 }}
          />
          <FormHelperText>{formErrors.quantity}</FormHelperText>
        </FormControl>
      </Grid>
    </Grid>
  );

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      {/* Add Allocation Button */}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h5">Inventory</Typography>
  <Button variant="contained" onClick={handleOpenModal}>
          Add Allocation
        </Button>
</Box>

      {/* Allocation Logs DataGrid */}
      <div>
      <DataGrid
        rows={allocationLogs}
        columns={columns}
        rowCount={totalRows}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 25]}
        loading={loading}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
      />
      </div>

      {/* Add Allocation Modal */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            maxWidth: { xs: '95vw', md: 600 },
            maxHeight: '90vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            margin: '0 auto',
            borderRadius: 2,
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              padding: '4px',
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
          </IconButton>
          <form onSubmit={handleSubmit}>
            {renderFormFields()}
            {/* {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>} */}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Allocate
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default InventoryList;