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
    InputAdornment,
    Autocomplete,
    CircularProgress as MuiCircularProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Paper from '@mui/material/Paper';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');

    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedCommission, setSelectedCommission] = useState(null);
    const [products, setProducts] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [formData, setFormData] = useState({
        product: null,
        technician: null,
        commissionAmount: 0
    });
    const [formLoading, setFormLoading] = useState(false);

    // Fetch commissions
    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                search: activeSearchTerm
            };
            const res = await commissionApi.getCommissions(params);

            setCommissions(
                (res.data.data?.data || []).map((commission) => ({
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
            } else if (openCreateModal || openEditModal) {
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
            } else if (openCreateModal || openEditModal) {
                fetchTechnicians();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [technicianSearch]);

    // Open modal for creating a commission
    const handleCreateOpen = () => {
        setFormData({ product: null, technician: null, commissionAmount: 0 });
        setFormErrors({});
        setOpenCreateModal(true);
    };

    // Open modal for editing a commission
    const handleEditOpen = (commission) => {
        setSelectedCommission(commission);
        setFormData({
            product: commission.product,
            technician: commission.technician,
            commissionAmount: commission.amount
        });
        setOpenEditModal(true);
    };

    // Close modal
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
        if (!formData.product) {
            errors.product = 'Product is required';
        }
        if (!formData.technician) {
            errors.technician = 'Technician is required';
        }
        if (formData.commissionAmount <= 0) {
            errors.commissionAmount = 'Commission amount must be a positive number';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setFormLoading(true);
        setError('');
        try {
            await commissionApi.createCommission({
                technicianId: formData.technician?._id,
                productId: formData.product?._id,
                amount: formData.commissionAmount
            });
            handleClose();
            fetchData();
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};
            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });
            setFormErrors(formattedErrors);
            setError(err.response?.data?.message || 'Failed to create commission');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!selectedCommission) return;
        setFormLoading(true);
        setError('');
        try {
            await commissionApi.updateCommission(
                selectedCommission.technician._id,
                selectedCommission.product._id,
                { amount: formData.commissionAmount }
            );
            handleClose();
            fetchData();
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};
            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });
            setFormErrors(formattedErrors);
            setError(err.response?.data?.message || 'Failed to update commission');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this commission?')) {
            return;
        }

        try {
            setLoading(true);
            await commissionApi.deleteCommission(id);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete commission');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { field: 'productName', headerName: 'Product', width: 200 },
        { field: 'technicianName', headerName: 'Technician', width: 200 },
        { field: 'amount', headerName: 'Commission Amount', width: 150 },
        {
            field: 'createdAt',
            headerName: 'Date',
            width: 200,
            valueFormatter: (params) => params ? new Date(params).toLocaleDateString() : 'N/A'
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

    const renderFormFields = () => (
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    disabled={openEditModal}
                    options={technicians}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    value={formData.technician}
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

            <Grid item xs={12} sm={6}>
                <Autocomplete
                    disabled={openEditModal}
                    options={products}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    value={formData.product}
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
                            step: "0.01",
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
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5">Commissions</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search commissions..."
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
                        Add Commission
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <DataGrid
                    rows={commissions}
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

            <Modal
                open={openCreateModal}
                onClose={handleClose}
        disableScrollLock 

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
                        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 3 }}
                            disabled={formLoading}
                            startIcon={formLoading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {formLoading ? "Creating..." : "Create Commission"}
                        </Button>
                    </form>
                </Box>
            </Modal>

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
                            {formLoading ? "Updating..." : "Update Commission"}
                        </Button>
                    </form>
                </Box>
            </Modal>
        </Box>
    );
};

export default CommissionList;