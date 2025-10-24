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
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import productApi from '../../api/product';

const ProductList = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5
  });
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    totalCount: 0,
    unitOfMeasure: '' // Added unitOfMeasure field
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = {
          page: paginationModel.page + 1,
          limit: paginationModel.pageSize
        };
        const res = await productApi.getProducts(params);
        setProducts(res.data.data.map(p => ({ ...p, id: p._id })));
        setTotalRows(res.data.pagination.total);
      } catch (err) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [paginationModel]);

  const handleCreateOpen = () => {
    setFormData({ name: '', price: 0, totalCount: 0, unitOfMeasure: '' });
    setFormErrors({});
    setOpenCreateModal(true);
  };

  const handleEditOpen = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      totalCount: product.totalCount,
      unitOfMeasure: product.unitOfMeasure || ''
    });
    setOpenEditModal(true);
  };

  const handleClose = () => {
    setOpenCreateModal(false);
    setOpenEditModal(false);
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

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (!formData.unitOfMeasure.trim()) {
      errors.unitOfMeasure = 'Unit of Measure is required';
    }

    if (formData.price <= 0) {
      errors.price = 'Price must be a positive number';
    }

    if (formData.totalCount < 0) {
      errors.totalCount = 'Available count cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create a new product
const handleCreate = async (e) => {
  try {

    e.preventDefault();
    if (!validateForm()) return;

    await productApi.createProduct(formData);
    handleClose();

    // Refresh data
    const res = await productApi.getProducts({
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize,
    });
    setProducts(res.data.data.map((p) => ({ ...p, id: p._id })));
  } catch (err) {
    const serverErrors = err.response?.data?.error?.details || {};
    const formattedErrors = {};
    Object.keys(serverErrors).forEach((field) => {
      formattedErrors[field] = serverErrors[field].message;
    });
    setFormErrors(formattedErrors);
    setError(err.response?.data?.message || 'Failed to create product');
  }
};

// Update an existing product
const handleUpdate = async (e) => {
  try {

    e.preventDefault();
    if (!validateForm()) return;

    if (!selectedProduct) {
      throw new Error('No product selected for update');
    }

    await productApi.updateProduct(selectedProduct._id, formData);
    handleClose();

    // Refresh data
    const res = await productApi.getProducts({
      page: paginationModel.page + 1,
      limit: paginationModel.pageSize,
    });
    setProducts(res.data.data.map((p) => ({ ...p, id: p._id })));
  } catch (err) {
    const serverErrors = err.response?.data?.error?.details || {};
    const formattedErrors = {};
    Object.keys(serverErrors).forEach((field) => {
      formattedErrors[field] = serverErrors[field].message;
    });
    setFormErrors(formattedErrors);
    setError(err.response?.data?.message || 'Failed to update product');
  }
};

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productApi.deleteProduct(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (err) {
        setError('Failed to delete product');
      }
    }
  };

  const columns = [
    { field: 'name', headerName: 'Product Name', width: 200 },
    { field: 'unitOfMeasure', headerName: 'Unit', width: 150 }, // Added unitOfMeasure
    { 
      field: 'price', 
      headerName: 'Price', 
      width: 150,
      valueFormatter: (params) => `₹${params.toFixed(2)}`
    },
    { field: 'totalCount', headerName: 'Total', width: 150 },
    { field: 'allocatedCount', headerName: 'Allocated', width: 150 },
    { 
      field: 'availableCount', 
      headerName: 'Available', 
      width: 150,
      renderCell: (params) => params.row.totalCount - params.row.allocatedCount
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleEditOpen(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={() => handleDelete(params.row.id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      )
    }
  ];

  const renderFormFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Product Name*"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          required
          error={!!formErrors.name}
          helperText={formErrors.name}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Unit of Measure*"
          name="unitOfMeasure"
          value={formData.unitOfMeasure}
          onChange={handleChange}
          fullWidth
          required
          error={!!formErrors.unitOfMeasure}
          helperText={formErrors.unitOfMeasure}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Price (₹)*"
          name="price"
          type="number"
          value={formData.price}
          onChange={handleChange}
          fullWidth
          required
          InputProps={{ inputProps: { min: 0, step: 0.01 } }}
          error={!!formErrors.price}
          helperText={formErrors.price}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Total Count*"
          name="totalCount"
          type="number"
          value={formData.totalCount}
          onChange={handleChange}
          fullWidth
          required
          InputProps={{ inputProps: { min: 0 } }}
          error={!!formErrors.totalCount}
          helperText={formErrors.totalCount}
        />
      </Grid>
    </Grid>
  );

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ height: 600, width: '100%' }}>
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h5">Products</Typography>
  <Button variant="contained" onClick={handleCreateOpen}>
    Add Product
  </Button>
</Box>

    <div>
      <DataGrid
        rows={products}
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
      {/* Create Modal */}
      <Modal
        open={openCreateModal}
        onClose={handleClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
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
            borderRadius: 2
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              padding: '4px'
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
          </IconButton>
          <form onSubmit={handleCreate}>
            {renderFormFields()}
            {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Create Product
            </Button>
          </form>
        </Box>
      </Modal>
      {/* Edit Modal */}
      <Modal
        open={openEditModal}
        onClose={handleClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
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
            borderRadius: 2
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              padding: '4px'
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
          </IconButton>
          <form onSubmit={handleUpdate}>
            {renderFormFields()}
            {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Update Product
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default ProductList;