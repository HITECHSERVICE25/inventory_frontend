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
    FormHelperText,
    Autocomplete
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import commissionApi from '../../api/commission';
import productApi from '../../api/product';
import technicianApi from '../../api/technician';

const CommissionList = () => {
    const { user } = useAuth();
    const [commissions, setCommissions] = useState([]);
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
    const [selectedCommission, setSelectedCommission] = useState(null);
    const [products, setProducts] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [formData, setFormData] = useState({
        productId: '',
        technicianId: '',
        commissionAmount: 0
    });

    // Autocomplete states
    const [productSearch, setProductSearch] = useState('');
    const [techSearch, setTechSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingTechnicians, setLoadingTechnicians] = useState(false);
    const [itemCache, setItemCache] = useState({}); // { id: { ...object } }

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                search: searchQuery
            };
            const res = await commissionApi.getCommissions(params);

            setCommissions(
                res.data.data.data.map((commission) => ({
                    ...commission,
                    id: commission._id,
                    productName: commission.product?.name ?? 'N/A',
                    technicianName: commission.technician?.name ?? 'N/A'
                }))
            );
            setTotalRows(res.data.data?.pagination?.total);
        } catch (err) {
            console.log(err);
            setError('Failed to load commissions');
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
            setLoadingProducts(true);
            try {
                const res = await productApi.getProducts({ limit: 5, search: productSearch });
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

    // Open modal for creating a commission
    const handleCreateOpen = () => {
        setFormData({ productId: '', technicianId: '', commissionAmount: 0 });
        setFormErrors({});
        setOpenCreateModal(true);
    };

    // Open modal for editing a commission
    const handleEditOpen = (commission) => {
        setSelectedCommission(commission);
        setFormData({
            productId: commission.product._id,
            technicianId: commission.technician._id,
            commissionAmount: commission.amount
        });
        if (commission.product) setItemCache(prev => ({ ...prev, [commission.product._id]: commission.product }));
        if (commission.technician) setItemCache(prev => ({ ...prev, [commission.technician._id]: commission.technician }));
        setOpenEditModal(true);
    };

    // Close modal
    const handleClose = () => {
        setOpenCreateModal(false);
        setOpenEditModal(false);
        setError('');
        setFormErrors({});
    };

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setFormErrors({ ...formErrors, [name]: null });
    };

    // Validate form fields
    const validateForm = () => {
        const errors = {};
        if (!formData.productId) {
            errors.productId = 'Product is required';
        }
        if (!formData.technicianId) {
            errors.technicianId = 'Technician is required';
        }
        if (formData.commissionAmount <= 0) {
            errors.commissionAmount = 'Commission amount must be a positive number';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Create a new commission
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            await commissionApi.createCommission({
                technicianId: formData.technicianId, productId: formData.productId,
                amount: formData.commissionAmount
            });
            handleClose();

            // Refresh data
            const res = await commissionApi.getCommissions({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize
            });
            setCommissions(
                res.data.data.data.map((commission) => ({
                    ...commission,
                    id: commission._id,
                    productName: commission.product.name,
                    technicianName: commission.technician.name
                }))
            );
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};
            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });
            setFormErrors(formattedErrors);
            setError(err.response?.data?.message || 'Failed to create commission');
        }
    };

    // Update an existing commission
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (!selectedCommission) {
                throw new Error('No commission selected for update');
            }

            await commissionApi.updateCommission(
                selectedCommission.technician._id,
                selectedCommission.product._id,
                { amount: formData.commissionAmount }
            );
            handleClose();

            // Refresh data
            const res = await commissionApi.getCommissions({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize
            });
            setCommissions(
                res.data.data.data.map((commission) => ({
                    ...commission,
                    id: commission._id,
                    productName: commission.product.name,
                    technicianName: commission.technician.name,

                }))
            );
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};
            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });
            setFormErrors(formattedErrors);
            setError(err.response?.data?.message || 'Failed to update commission');
        }
    };

    // Delete a commission
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this commission?')) {
            return;
        }

        try {
            setLoading(true);

            await commissionApi.deleteCommission(id);

            // Refresh current page data (server pagination safe)
            const res = await commissionApi.getCommissions({
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize
            });

            setCommissions(
                res.data.data.data.map((commission) => ({
                    ...commission,
                    id: commission._id,
                    productName: commission.product?.name ?? 'N/A',
                    technicianName: commission.technician?.name ?? 'N/A'
                }))
            );

            setTotalRows(res.data.data?.pagination?.total);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete commission');
        } finally {
            setLoading(false);
        }
    };


    // DataGrid columns
    const columns = [
        { field: 'productName', headerName: 'Product', width: 200 },
        { field: 'technicianName', headerName: 'Technician', width: 200 },
        { field: 'amount', headerName: 'Commission Amount', width: 150 },
        {
            field: 'createdAt',
            headerName: 'Date',
            width: 200,
            valueFormatter: (params) => new Date(params).toLocaleDateString()
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
                        <IconButton onClick={() => handleDelete(params.row.id)} color="error">
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </>
            )
        }
    ];

    // Render form fields
    const renderFormFields = () => (
        <Grid container spacing={2}>
            {/* Technician Selection (disabled in edit mode) */}
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
                    disabled={openEditModal}
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

            {/* Product Selection (disabled in edit mode) */}
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    options={[...(formData.productId ? [itemCache[formData.productId]] : []), ...products].filter((p, i, self) => p && self.findIndex(s => s._id === p._id) === i)}
                    getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option.name || '';
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
                    disabled={openEditModal}
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

            {/* Commission Amount Input */}
            <Grid item xs={12} sm={6}>
                <TextField
                    label="Commission Amount (₹)*"
                    name="commissionAmount"
                    type="number"
                    value={formData.commissionAmount}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputProps={{
                        inputProps: {
                            min: 0,
                            step: "0.01",   // 👈 THIS FIXES IT
                        },
                    }}
                    error={!!formErrors.commissionAmount}
                    helperText={formErrors.commissionAmount}
                />
            </Grid>
        </Grid>
    );

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <Box sx={{ flexShrink: 0, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">Commissions</Typography>
                    <Button variant="contained" onClick={handleCreateOpen}>
                        Add Commission
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                    <TextField
                        label="Search Commissions..."
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

                {error && <Box sx={{ color: 'error.main', mb: 2 }}>{error}</Box>}
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <DataGrid
                    rows={commissions}
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

            {/* Create Modal */}
            <Modal
                open={openCreateModal}
                onClose={handleClose}
        disableScrollLock

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
            width: { xs: '95vw', md: 600 }, 
                        
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
                            Create Commission
                        </Button>
                    </form>
                </Box>
            </Modal>

            {/* Edit Modal */}
            <Modal
                open={openEditModal}
                onClose={handleClose}
        disableScrollLock

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
            width: { xs: '95vw', md: 600 }, 
                        
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
                            Update Commission
                        </Button>
                    </form>
                </Box>
            </Modal>
        </Box>
    );
};

export default CommissionList;