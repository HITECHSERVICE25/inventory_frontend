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
  Autocomplete,
  CircularProgress as MuiCircularProgress,
  Card,
  CardContent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment, Paper } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import inventoryApi from '../../api/inventory';
import productApi from '../../api/product';
import technicianApi from '../../api/technician';
import DateRangeExport from '../../components/DateRangeExport';

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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [openModal, setOpenModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    product: null,
    technician: null,
    quantity: 0,
  });
  const [formLoading, setFormLoading] = useState(false);

  // Fetch allocation logs
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: activeSearchTerm
      };
      const res = await inventoryApi.getAllocationLogs(params);
      setAllocationLogs(res.data.data.map((log) => ({ ...log, id: log._id, productName: log.product?.name || 'N/A', technicianName: log.technician?.name || 'N/A' })));
      setTotalRows(res.data.pagination.total);
    } catch (err) {
      console.log(err);
      setError('Failed to load allocation logs');
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

  const [productSearch, setProductSearch] = useState('');
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  // Fetch products for dropdown
  const fetchProducts = async (search = '') => {
    try {
      setLoadingProducts(true);
      const res = await productApi.getProducts({ search, limit: 5 });
      setProducts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch technicians for dropdown
  const fetchTechnicians = async (search = '') => {
    try {
      setLoadingTechnicians(true);
      const res = await technicianApi.getTechnicians({ search, limit: 5 });
      setTechnicians(res.data.data || []);
    } catch (err) {
      console.error('Failed to load technicians', err);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTechnicians();
  }, []);

  // Handle product search in dropdown
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearch) {
        fetchProducts(productSearch);
      } else if (openModal) {
        fetchProducts();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch]);

  // Handle technician search in dropdown
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (technicianSearch) {
        fetchTechnicians(technicianSearch);
      } else if (openModal) {
        fetchTechnicians();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [technicianSearch]);

  const handleOpenModal = () => {
    setFormData({ product: null, technician: null, quantity: 0 });
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

    if (!formData.product) {
      errors.product = 'Product is required';
    }

    if (!formData.technician) {
      errors.technician = 'Technician is required';
    }

    if (formData.product) {
      const availableQuantity =
        formData.product.totalCount - formData.product.allocatedCount;
      if (formData.quantity > availableQuantity || formData.quantity <= 0) {
        errors.quantity = `Quantity must be between 1 and ${availableQuantity}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    setError('');
    try {
      const submissionData = {
        ...formData,
        productId: formData.product?._id,
        technicianId: formData.technician?._id
      };
      await inventoryApi.createAllocation(submissionData);
      handleCloseModal();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create allocation');
    } finally {
      setFormLoading(false);
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
        <Autocomplete
          options={products}
          getOptionLabel={(option) => {
            const label = option.name || '';
            const available = (option.totalCount || 0) - (option.allocatedCount || 0);
            return `${label} (Available: ${available})`;
          }}
          value={formData.product}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          onInputChange={(event, newInputValue) => {
            setProductSearch(newInputValue);
          }}
          onChange={(event, newValue) => {
            setFormData({ ...formData, product: newValue });
            setFormErrors({ ...formErrors, product: null });
          }}
          loading={loadingProducts}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Product*"
              error={!!formErrors.product}
              helperText={formErrors.product}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingProducts ? <MuiCircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      </Grid>

      {/* Technician Selection */}
      <Grid item xs={12} sm={6}>
        <Autocomplete
          options={technicians}
          getOptionLabel={(option) => option.name || ''}
          value={formData.technician}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          onInputChange={(event, newInputValue) => {
            setTechnicianSearch(newInputValue);
          }}
          onChange={(event, newValue) => {
            setFormData({ ...formData, technician: newValue });
            setFormErrors({ ...formErrors, technician: null });
          }}
          loading={loadingTechnicians}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Technician*"
              error={!!formErrors.technician}
              helperText={formErrors.technician}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingTechnicians ? <MuiCircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
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
    <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', overflowY: 'auto' }}>
      {/* Header */}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">Inventory</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search inventory..."
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={handleSearch}>
              Search
            </Button>
            <Button variant="contained" onClick={handleOpenModal}>
              Add Allocation
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <DateRangeExport
          title="Export Inventory"
          filePrefix="Inventory"
          exportApi={inventoryApi.exportAllocations}
        />
      </Box>
      {/* Allocation Logs DataGrid or Card View */}
      <Paper sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
        {isMobile ? (
          <Box sx={{ p: 1 }}>
            {allocationLogs.map((log) => (
              <Card key={log.id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{log.productName}</Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">Qty: {log.quantity}</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">Technician: {log.technicianName}</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                    Date: {new Date(log.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            {allocationLogs.length === 0 && !loading && (
              <Typography align="center" sx={{ py: 4, color: 'text.secondary' }}>No allocation logs found</Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={allocationLogs}
              columns={columns}
              rowCount={totalRows}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[5, 10, 25]}
              loading={loading}
              disableSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-footerContainer': {
                  position: 'sticky',
                  bottom: 0,
                  backgroundColor: 'white',
                  zIndex: 1,
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Add Allocation Modal */}
      <Modal
        open={openModal}

        onClose={handleCloseModal}
        disableScrollLock
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: { xs: '95vw', md: 600 },
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
            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              disabled={formLoading}
              startIcon={formLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {formLoading ? "Allocating..." : "Allocate"}
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default InventoryList;