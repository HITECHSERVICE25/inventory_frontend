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
  Autocomplete
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
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
  const [openModal, setOpenModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    productId: '',
    technicianId: '',
    quantity: 0,
  });

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Autocomplete states
  const [productSearch, setProductSearch] = useState('');
  const [techSearch, setTechSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [itemCache, setItemCache] = useState({}); // { id: { ...object } }

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery
      };
      const res = await inventoryApi.getAllocationLogs(params);
      setAllocationLogs(res.data.data.map((log) => ({
        ...log,
        id: log._id,
        productName: log.product?.name || 'N/A',
        technicianName: log.technician?.name || 'N/A'
      })));
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
  }, [paginationModel, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Fetch products for autocomplete
  useEffect(() => {
  const fetchAuthProducts = async () => {
    // if (!productSearch) return;

    setLoadingProducts(true);

    try {
      // Remove " (Available: X)" part using regex
      const cleanedSearch = productSearch?.replace(/\s*\(.*$/, "");

      const res = await productApi.getProducts({
        page: 1,
        limit: 5,
        search: cleanedSearch || '',
      });

      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  fetchAuthProducts();
}, [productSearch]);

  // Fetch technicians for autocomplete
  useEffect(() => {
    const fetchAuthTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const res = await technicianApi.getTechnicians({ limit: 5, search: techSearch });
        setTechnicians(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTechnicians(false);
      }
    };
    fetchAuthTechnicians();
  }, [techSearch]);

  // Update itemCache when products or technicians change
  useEffect(() => {
    const newCache = { ...itemCache };
    let changed = false;
    products.forEach(p => {
      if (!newCache[p._id]) {
        newCache[p._id] = p;
        changed = true;
      }
    });
    technicians.forEach(t => {
      if (!newCache[t._id]) {
        newCache[t._id] = t;
        changed = true;
      }
    });
    if (changed) setItemCache(newCache);
  }, [products, technicians]);

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

    console.log(products, formData);

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
        <Autocomplete
          options={[...(formData.productId ? [itemCache[formData.productId]] : []), ...products].filter((p, i, self) => p && self.findIndex(s => s._id === p._id) === i)}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            return option.name ? `${option.name} (Available: ${option.totalCount - option.allocatedCount})` : '';
          }}
          value={itemCache[formData.productId] || null}
          onChange={(event, newValue) => {
            if (newValue) setItemCache(prev => ({ ...prev, [newValue._id]: newValue }));
            setFormData({ ...formData, productId: newValue ? newValue._id : '' });
          }}
          onInputChange={(event, newInputValue) => {
            setProductSearch(newInputValue);
          }}
          filterOptions={(x) => x}
          loading={loadingProducts}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Product*"
              error={!!formErrors.productId}
              helperText={formErrors.productId}
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
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
          options={[...(formData.technicianId ? [itemCache[formData.technicianId]] : []), ...technicians].filter((t, i, self) => t && self.findIndex(s => s._id === t._id) === i)}
          getOptionLabel={(option) => {
            if (typeof option === 'string') return option;
            return option.name || '';
          }}
          value={itemCache[formData.technicianId] || null}
          onChange={(event, newValue) => {
            if (newValue) setItemCache(prev => ({ ...prev, [newValue._id]: newValue }));
            setFormData({ ...formData, technicianId: newValue ? newValue._id : '' });
          }}
          onInputChange={(event, newInputValue) => {
            setTechSearch(newInputValue);
          }}
          filterOptions={(x) => x}
          loading={loadingTechnicians}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Technician*"
              error={!!formErrors.technicianId}
              helperText={formErrors.technicianId}
              size="small"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingTechnicians ? <CircularProgress color="inherit" size={20} /> : null}
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
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Inventory</Typography>
          <Button variant="contained" onClick={handleOpenModal}>
            Add Allocation
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            label="Search Inventory..."
            variant="outlined"
            size="small"
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Press Enter to search by product or technician..."
            sx={{ width: 350 }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              height: 40,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Search
          </Button>

          {searchQuery && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setPaginationModel(prev => ({ ...prev, page: 0 }));
              }}
              sx={{ height: 40, textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
        </Box>

        <DateRangeExport
          title="Export Inventory"
          filePrefix="Inventory"
          exportApi={inventoryApi.exportAllocations}
        />

        {error && <Box sx={{ color: 'error.main', mb: 2 }}>{error}</Box>}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={allocationLogs}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          sx={{
            height: '100%',
            '& .MuiDataGrid-cell': {
              py: 1
            }
          }}
        />
      </Box>

      {/* Add Allocation Modal */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        disableScrollLock
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