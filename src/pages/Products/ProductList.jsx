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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import productApi from '../../api/product';

import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

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
  const [formLoading, setFormLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: activeSearchTerm
      };
      const res = await productApi.getProducts(params);
      setProducts((res.data.data || []).map(p => ({ ...p, id: p._id })));
      setTotalRows(res.data.pagination?.total || 0);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [paginationModel, activeSearchTerm]);

  const handleSearch = () => {
    setActiveSearchTerm(searchTerm);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    setError('');
    try {
      await productApi.createProduct(formData);
      handleClose();
      fetchData();
    } catch (err) {
      const serverErrors = err.response?.data?.error?.details || {};
      const formattedErrors = {};
      Object.keys(serverErrors).forEach((field) => {
        formattedErrors[field] = serverErrors[field].message;
      });
      setFormErrors(formattedErrors);
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  // Update an existing product
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedProduct) return;
    setFormLoading(true);
    setError('');
    try {
      await productApi.updateProduct(selectedProduct._id, formData);
      handleClose();
      fetchData();
    } catch (err) {
      const serverErrors = err.response?.data?.error?.details || {};
      const formattedErrors = {};
      Object.keys(serverErrors).forEach((field) => {
        formattedErrors[field] = serverErrors[field].message;
      });
      setFormErrors(formattedErrors);
      setError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setFormLoading(false);
    }
  };

    const [deleteId, setDeleteId] = useState(null);
  

  const handleDelete = async (id) => {
    
      try {
        await productApi.deleteProduct(id);
        setDeleteId(null);
        fetchData();
      } catch (err) {
        setError('Failed to delete product');
      }
    
  };

  const columns = [
    { field: 'name', headerName: 'Product Name', width: 200 },
    { field: 'unitOfMeasure', headerName: 'Unit', width: 150 }, // Added unitOfMeasure
    {
      field: 'price',
      headerName: 'Price',
      width: 150,
      valueFormatter: (value) => `₹${Number(value ?? 0).toFixed(2)}`
    },
    { field: 'totalCount', headerName: 'Total', width: 150 },
    { field: 'allocatedCount', headerName: 'Allocated', width: 150 },
    {
      field: 'availableCount',
      headerName: 'Available',
      width: 150,
      renderCell: (params) => (params.row.totalCount || 0) - (params.row.allocatedCount || 0)
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
              onClick={(e) => {
                e.stopPropagation();
  setDeleteId(params.row.id);
                
              }}
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
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">Products</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" onClick={handleSearch}>
            Search
          </Button>
          <Button variant="contained" onClick={handleCreateOpen}>
            Add Product
          </Button>
        </Box>
      </Box>

      <Paper sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={products}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          disableSelectionOnClick
          autoHeight={false}
          sx={{
            flexGrow: 1,
            '& .MuiDataGrid-footerContainer': {
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white',
              zIndex: 1,
            },
            border: 'none',
          }}
        />
      </Paper>
      {/* Create Modal */}
      <Modal
        open={openCreateModal}
        onClose={handleClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto'
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
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={formLoading}
              startIcon={formLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {formLoading ? "Creating..." : "Create Product"}
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
          overflow: 'auto'
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
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={formLoading}
              startIcon={formLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {formLoading ? "Updating..." : "Update Product"}
            </Button>
          </form>
        </Box>
      </Modal>
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
  <DialogTitle>Delete Product</DialogTitle>
  <DialogContent>
    Are you sure you want to delete this product?
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
    <Button
      color="error"
      onClick={() => handleDelete(deleteId)}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default ProductList;