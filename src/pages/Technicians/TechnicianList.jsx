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
    Typography
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
        companies: [],
        isBlocked: false
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch technicians with pagination
                const techParams = {
                    page: paginationModel.page + 1,
                    limit: paginationModel.pageSize
                };
                const techRes = await technicianApi.getTechnicians(techParams);
                setTechnicians(techRes.data.data.map(t => ({ ...t, id: t._id })));
                setTotalRows(techRes.data.pagination.total);

                // Fetch companies for dropdown
                const companyRes = await companyApi.getCompanies();
                setCompanies(companyRes.data.data);
            } catch (err) {
                setError('Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [paginationModel]);

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
            companies: technician.companies.map(c => c._id)
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

    try {
      await technicianApi.createTechnician(formData);
      handleClose();
  
      // Refresh data
      const res = await technicianApi.getTechnicians({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      });
      setTechnicians(res.data.data.map((t) => ({ ...t, id: t._id })));
      setTotalRows(res.data.totalCount);
    } catch (err) {
        console.log("error:", err);
      const serverErrors = err.response?.data?.error?.details || {};
      const formattedErrors = {};
  
      // Format server validation errors
      Object.keys(serverErrors).forEach((field) => {
        formattedErrors[field] = serverErrors[field].message;
      });
  
      setFormErrors(formattedErrors);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create technician');
    }
  };
  
  // Update an existing technician
  const handleUpdate = async (e) => {

    e.preventDefault();

        if (!validateForm()) return;

    try {
      if (!selectedTechnician) {
        throw new Error('No technician selected for update');
      }
  
      await technicianApi.updateTechnician(selectedTechnician._id, formData);
      handleClose();
  
      // Refresh data
      const res = await technicianApi.getTechnicians({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      });
      setTechnicians(res.data.data.map((t) => ({ ...t, id: t._id })));
      setTotalRows(res.data.totalCount);
    } catch (err) {
      const serverErrors = err.response?.data?.error?.details || {};
      const formattedErrors = {};
  
      // Format server validation errors
      Object.keys(serverErrors).forEach((field) => {
        formattedErrors[field] = serverErrors[field].message;
      });
  
      setFormErrors(formattedErrors);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update technician');
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
                    {params.value.map(company => (
                        <Chip key={company._id} label={company.name} sx={{ mb: 0.5 }} />
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

            {/* Company Selection */}
            <Grid item xs={12}>
                <FormControl fullWidth error={!!formErrors.companies}>
                    <InputLabel>Companies*</InputLabel>
                    <Select
                        multiple
                        name="companies"
                        value={formData.companies}
                        onChange={handleCompanyChange}
                        renderValue={(selected) => (
                            <Box sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                                maxWidth: '100%' // Prevent overflow
                            }}>
                                {selected.map((value) => (
                                    <Chip
                                        key={value}
                                        label={companies.find(c => c._id === value)?.name}
                                        sx={{ maxWidth: '100%', overflow: 'hidden' }} // Responsive chips
                                    />
                                ))}
                            </Box>
                        )}
                    >
                        {companies.map((company) => (
                            <MenuItem key={company._id} value={company._id}>
                                {company.name}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>{formErrors.companies}</FormHelperText>
                </FormControl>
            </Grid>
        </Grid>
    );

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Technicians</Typography>
              <Button
                variant="contained"
                onClick={handleCreateOpen}
            >
                Add Technician
            </Button>
            </Box>
            <div>
            <DataGrid
                rows={technicians}
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
                        {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
                        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
                            Create Technician
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
                    overflow: 'hidden' // Disable body scroll [[2]]
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
                        {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
                        <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
                            Update Technician
                        </Button>
                    </form>
                </Box>
            </Modal>
        </Box>
    );
};

export default TechnicianList;