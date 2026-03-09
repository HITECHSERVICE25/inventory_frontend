import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Modal,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Tooltip,
    IconButton,
    FormHelperText,
    Grid,
    Typography,
    Autocomplete,
    CircularProgress as MuiCircularProgress,
    Paper,
    Card,
    CardContent,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import {
    Edit as EditIcon,
    Block as BlockIcon,
    LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import technicianApi from '../../api/technician';
import companyApi from '../../api/company';

import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

const TechnicianList = () => {
    const { user } = useAuth();
    const [technicians, setTechnicians] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 5
    });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');

    // Modal states
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        aadhaar: '',
        pan: '',
        serviceRate: 0,
        miscShare: 0,
        companies: [],
        isBlocked: false
    });
    const [formLoading, setFormLoading] = useState(false);

    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companySearch, setCompanySearch] = useState('');

    const fetchCompaniesDropdown = async (search = '') => {
        try {
            setLoadingCompanies(true);
            const res = await companyApi.getCompanies({ search, limit: 5 });
            setCompanies(res.data.data || []);
        } catch (err) {
            console.error('Failed to load companies', err);
        } finally {
            setLoadingCompanies(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (companySearch) fetchCompaniesDropdown(companySearch);
            else if (openCreateModal || openEditModal) fetchCompaniesDropdown();
        }, 500);
        return () => clearTimeout(timer);
    }, [companySearch]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const techParams = {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize,
                search: activeSearchTerm
            };
            const techRes = await technicianApi.getTechnicians(techParams);
            setTechnicians((techRes.data.data || []).map(t => ({ ...t, id: t._id })));
            setTotalRows(techRes.data.pagination?.total || 0);
        } catch (err) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCompaniesDropdown();
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
        setFormData({
            name: '',
            phone: '',
            email: '',
            address: {
                street: '',
                city: '',
                state: '',
                pincode: ''
            },
            aadhaar: '',
            pan: '',
            serviceRate: 0,
            miscShare: 0, // ✅ NEW
            companies: [],
            isBlocked: false
        });

        setFormErrors({});
        setOpenCreateModal(true);
    };

    const handleEditOpen = (technician) => {
        setSelectedTechnician(technician);
        setFormData({
            ...technician,
            companies: technician.companies || []
        });
        setFormErrors({});
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

        if (name.startsWith('address.')) {
            setFormData({
                ...formData,
                address: {
                    ...formData.address,
                    [name.split('.')[1]]: value
                }
            });
            setFormErrors({
                ...formErrors,
                [name.split('.')[1]]: null
            });
        } else {
            setFormData({ ...formData, [name]: value });
            setFormErrors({ ...formErrors, [name]: null });
        }
    };

    const handleCompanyChange = (event) => {
        setFormData({
            ...formData,
            companies: event.target.value
        });
        setFormErrors({ ...formErrors, companies: null });
    };

    const validateForm = () => {
        const errors = {};

        // Name validation
        if (!formData.name.trim()) errors.name = 'Name is required';

        // Phone validation
        if (!/^[6-9]\d{9}$/.test(formData.phone)) {
            errors.phone = 'Invalid Indian mobile number';
        }

        // Email validation
        if (!formData.email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
            errors.email = 'Invalid email format';
        }

        // Address validation
        if (!formData.address.street.trim()) errors.street = 'Street is required';
        if (!formData.address.city.trim()) errors.city = 'City is required';
        if (!formData.address.state.trim()) errors.state = 'State is required';
        if (!formData.address.pincode.match(/^\d{6}$/)) {
            errors.pincode = 'Invalid 6-digit PIN code';
        }

        // Aadhaar validation
        if (!formData.aadhaar.match(/^\d{12}$/)) {
            errors.aadhaar = '12-digit number required';
        }

        // PAN validation
        if (!formData.pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
            errors.pan = 'Invalid PAN format';
        }

        // Service rate validation
        if (formData.serviceRate <= 0) {
            errors.serviceRate = 'Must be positive number';
        }

        // Misc share validation (0–100)
        if (formData.miscShare < 0 || formData.miscShare > 100) {
            errors.miscShare = 'Must be between 0 and 100';
        }


        // Companies validation
        if (formData.companies.length === 0) {
            errors.companies = 'At least one company required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };



    // Create a new technician
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setFormLoading(true);
        setError('');
        try {
            const submissionData = {
                ...formData,
                companies: formData.companies.map(c => c._id || c)
            };
            await technicianApi.createTechnician(submissionData);
            handleClose();
            fetchData();
        } catch (err) {
            console.log("error:", err);
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};

            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });

            setFormErrors(formattedErrors);
            setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create technician');
        } finally {
            setFormLoading(false);
        }
    };

    // Update an existing technician
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!selectedTechnician) return;
        setFormLoading(true);
        setError('');
        try {
            const submissionData = {
                ...formData,
                companies: formData.companies.map(c => c._id || c)
            };
            await technicianApi.updateTechnician(selectedTechnician._id, submissionData);
            handleClose();
            fetchData();
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};

            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field].message;
            });

            setFormErrors(formattedErrors);
            setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update technician');
        } finally {
            setFormLoading(false);
        }
    };

    const handleBlockToggle = async (id, isBlocked) => {
        try {
            await technicianApi.updateBlockedStatus(id, { isBlocked: !isBlocked });
            // Update local state
            setTechnicians(technicians.map(t =>
                t.id === id ? { ...t, isBlocked: !isBlocked } : t
            ));
        } catch (err) {
            setError('Failed to update status');
        }
    };

    const columns = [
        { field: 'name', headerName: 'Name', width: 150 },
        { field: 'phone', headerName: 'Phone', width: 150 },
        { field: 'email', headerName: 'Email', width: 200 },
        {
            field: 'companies',
            headerName: 'Companies',
            width: 200,
            renderCell: (params) => (
                <div>
                    {(params.value || []).map(company => (
                        <Chip key={company?._id || Math.random()} label={company?.name || 'N/A'} sx={{ mb: 0.5 }} />
                    ))}
                </div>
            )
        },
        {
            field: 'isBlocked',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'Blocked' : 'Active'}
                    color={params.value ? 'error' : 'success'}
                />
            )
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
                    <Tooltip title={params.row.isBlocked ? 'Unblock' : 'Block'}>
                        <IconButton
                            onClick={() => handleBlockToggle(params.row.id, params.row.isBlocked)}
                            color={params.row.isBlocked ? 'default' : 'error'}
                        >
                            {params.row.isBlocked ? <LockOpenIcon /> : <BlockIcon />}
                        </IconButton>
                    </Tooltip>
                </>
            )
        }
    ];

    const renderFormFields = () => (
        <Grid container spacing={2} sx={{ maxWidth: '100%', px: 2 }}> {/* Added container constraints */}
            {/* Basic Info */}
            <Grid item xs={12} md={6}> {/* Adjusted breakpoint */}
                <TextField
                    label="Name*"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={6}> {/* Added md breakpoint */}
                <TextField
                    label="Phone*"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.phone}
                    helperText={formErrors.phone}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
                <TextField
                    label="Email*"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                />
            </Grid>

            {/* Address Fields */}
            <Grid item xs={12} md={6}>
                <TextField
                    label="Street*"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.street}
                    helperText={formErrors.street}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="City*"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.city}
                    helperText={formErrors.city}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="State*"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.state}
                    helperText={formErrors.state}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="PIN Code*"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.pincode}
                    helperText={formErrors.pincode}
                />
            </Grid>

            {/* ID and Rate */}
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="Aadhaar*"
                    name="aadhaar"
                    value={formData.aadhaar}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.aadhaar}
                    helperText={formErrors.aadhaar}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="PAN*"
                    name="pan"
                    value={formData.pan}
                    onChange={handleChange}
                    fullWidth
                    required
                    error={!!formErrors.pan}
                    helperText={formErrors.pan}
                />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="Misc Share (%)"
                    name="miscShare"
                    type="number"
                    value={formData.miscShare}
                    onChange={handleChange}
                    fullWidth
                    InputProps={{
                        inputProps: { min: 0, max: 100, step: 0.01 },
                        sx: { maxWidth: '150px' }
                    }}
                    error={!!formErrors.miscShare}
                    helperText={formErrors.miscShare}
                />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
                <TextField
                    label="Service Rate (₹)*"
                    name="serviceRate"
                    type="number"
                    value={formData.serviceRate}
                    onChange={handleChange}
                    fullWidth
                    required
                    InputProps={{
                        inputProps: { min: 0, step: 0.01 },
                        sx: { maxWidth: '150px' } // Constrain width for numbers
                    }}
                    error={!!formErrors.serviceRate}
                    helperText={formErrors.serviceRate}
                />
            </Grid>

            <Grid item xs={12}>
                <Autocomplete
                    multiple
                    options={companies}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => (option._id || option) === (value._id || value)}
                    value={formData.companies}
                    onInputChange={(event, newInputValue) => {
                        setCompanySearch(newInputValue);
                    }}
                    onChange={(event, newValue) => {
                        setFormData({
                            ...formData,
                            companies: newValue
                        });
                        setFormErrors({ ...formErrors, companies: null });
                    }}
                    loading={loadingCompanies}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Companies*"
                            error={!!formErrors.companies}
                            helperText={formErrors.companies}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loadingCompanies ? <MuiCircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </Grid>
        </Grid>
    );

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', display: 'flex', flexDirection: 'column' }}>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5">Technicians</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search technicians..."
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
                    <Button
                        variant="contained"
                        onClick={handleCreateOpen}
                    >
                        Add Technician
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {isMobile ? (
                    <Box sx={{ overflowY: 'auto', p: 1 }}>
                        {technicians.map((tech) => (
                            <Card key={tech.id} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">{tech.name}</Typography>
                                        <Chip
                                            label={tech.isBlocked ? 'Blocked' : 'Active'}
                                            color={tech.isBlocked ? 'error' : 'success'}
                                            size="small"
                                        />
                                    </Box>
                                    <Typography variant="body2" color="textSecondary">Phone: {tech.phone}</Typography>
                                    <Typography variant="body2" color="textSecondary">Email: {tech.email}</Typography>
                                    <Box sx={{ mt: 1, mb: 1 }}>
                                        {(tech.companies || []).map(company => (
                                            <Chip
                                                key={company?._id || Math.random()}
                                                label={company?.name || 'N/A'}
                                                size="small"
                                                sx={{ mr: 0.5, mb: 0.5 }}
                                            />
                                        ))}
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                        <IconButton onClick={() => handleEditOpen(tech)} color="primary">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleBlockToggle(tech.id, tech.isBlocked)}
                                            color={tech.isBlocked ? 'default' : 'error'}
                                        >
                                            {tech.isBlocked ? <LockOpenIcon /> : <BlockIcon />}
                                        </IconButton>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                        {technicians.length === 0 && !loading && (
                            <Typography align="center" sx={{ mt: 4 }}>No technicians found</Typography>
                        )}
                    </Box>
                ) : (
                    <DataGrid
                        rows={technicians}
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
                )}
            </Paper>

            {/* Create Modal */}
            <Modal
                open={openCreateModal}
                onClose={handleClose}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto',
                }}
            >
                <Box
                    sx={{
                        position: 'relative', // Container for absolute positioning [[9]]
                        maxWidth: { xs: '95vw', md: 600 },
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        p: 4,
                        margin: '0 auto',
                        borderRadius: 2 // Smooth edges for mobile [[6]]
                    }}
                >
                    {/* Close button positioned at top-right */}
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1, // Ensure it stays above content [[7]]
                            padding: '4px', // Smaller touch target for mobile [[3]]
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' } // Subtle hover effect
                        }}
                    >
                        <CloseIcon sx={{ fontSize: { xs: 20, md: 24 } }} /> {/* Responsive icon size */}
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
                            {formLoading ? "Creating..." : "Create Technician"}
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
                    overflow: 'auto',
                }}
            >
                <Box
                    sx={{
                        position: 'relative', // Required for absolute positioning of close button [[10]]
                        maxWidth: { xs: '95vw', md: 600 }, // Responsive width [[9]]
                        maxHeight: '90vh',
                        overflowY: 'auto', // Enable content scrolling [[7]]
                        bgcolor: 'background.paper',
                        boxShadow: 24,
                        p: 4,
                        margin: '0 auto',
                        borderRadius: 2
                    }}
                >
                    {/* Close button positioned at top-right */}
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1, // Keep above form content [[7]]
                            padding: '4px',
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                        }}
                    >
                        <CloseIcon sx={{ fontSize: { xs: 20, md: 24 } }} /> {/* Responsive icon [[3]] */}
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
                            {formLoading ? "Updating..." : "Update Technician"}
                        </Button>
                    </form>
                </Box>
            </Modal>
        </Box>
    );
};

export default TechnicianList;