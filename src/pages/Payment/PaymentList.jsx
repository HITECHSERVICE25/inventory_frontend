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
    Tabs,
    Tab,
    Card,
    CardContent,
    Alert,
    Avatar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import {
    Receipt as ReceiptIcon,
    Visibility as ViewIcon,
    Payment as PaymentIcon,
    AccountBalance as BalanceIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import paymentApi from '../../api/payment';
import technicianApi from '../../api/technician';

const PaymentList = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [payments, setPayments] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [techniciansWithBalances, setTechniciansWithBalances] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formErrors, setFormErrors] = useState({});

    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10
    });

    // Modal states
    const [openPaymentModal, setOpenPaymentModal] = useState(false);
    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);

    const [formData, setFormData] = useState({
        technicianId: '',
        amount: '',
        method: 'bank_transfer',
        reference: '',
        notes: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                if (activeTab === 0) {
                    // Fetch all payments
                    const paymentParams = {
                        page: paginationModel.page + 1,
                        limit: paginationModel.pageSize
                    };
                    const paymentRes = await paymentApi.getPayments(paymentParams);
                    setPayments(paymentRes.data.data.payments.map(p => ({ ...p, id: p._id })));
                    setTotalRows(paymentRes.data.data.pagination.total);
                } else {
                    // Fetch technicians with balances
                    const balanceRes = await paymentApi.getTechniciansWithBalances({
                        page: paginationModel.page + 1,
                        limit: paginationModel.pageSize
                    });
                    setTechniciansWithBalances(balanceRes.data.data.technicians.map(t => ({ ...t, id: t._id })));
                    setTotalRows(balanceRes.data.data.pagination.total);
                }

                // Fetch technicians for dropdown
                const techRes = await technicianApi.getTechnicians({ limit: 1000 });
                setTechnicians(techRes.data.data);
            } catch (err) {
                setError('Failed to load data: ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [paginationModel, activeTab]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        setPaginationModel({ page: 0, pageSize: 10 });
    };

    const handlePaymentOpen = (technician = null) => {
        if (technician) {
            console.log(technician);
            setFormData({
                technicianId: technician._id,
                amount: Math.min(technician.outstandingBalance, technician.outstandingBalance).toFixed(2),
                method: 'bank_transfer',
                reference: '',
                notes: ''
            });
            setSelectedTechnician(technician);
        } else {
            setFormData({
                technicianId: '',
                amount: '',
                method: 'bank_transfer',
                reference: '',
                notes: ''
            });
            setSelectedTechnician(null);
        }
        setFormErrors({});
        setError('');
        setSuccess('');
        setOpenPaymentModal(true);
    };

    const handleViewDetails = async (payment) => {
        try {
            const paymentRes = await paymentApi.getPaymentDetails(payment._id);
            setPaymentDetails(paymentRes.data.data);
            setOpenDetailsModal(true);
        } catch (err) {
            setError('Failed to load payment details: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleClose = () => {
        setOpenPaymentModal(false);
        setOpenDetailsModal(false);
        setPaymentDetails(null);
        setError('');
        setSuccess('');
        setFormErrors({});
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setFormErrors({ ...formErrors, [name]: null });
    };

    const handleTechnicianChange = (e) => {
        const technicianId = e.target.value;
        const technician = technicians.find(t => t._id === technicianId);
        setFormData({ 
            ...formData, 
            technicianId,
            amount: technician ? technician.outstandingBalance : ''
        });
        setSelectedTechnician(technician);
        setFormErrors({ ...formErrors, technicianId: null, amount: null });
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.technicianId) errors.technicianId = 'Technician is required';
        if (!formData.amount || formData.amount <= 0) errors.amount = 'Valid amount is required';
        
        const technician = selectedTechnician || technicians.find(t => t._id === formData.technicianId);
        if (technician && formData.amount > technician.outstandingBalance) {
            errors.amount = 'Amount exceeds outstanding balance';
        }
        
        if (!formData.method) errors.method = 'Payment method is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const paymentData = {
                amount: parseFloat(formData.amount),
                method: formData.method,
                reference: formData.reference,
                notes: formData.notes,
                receivedBy: user._id
            };

            await paymentApi.recordPayment(formData.technicianId, paymentData);
            
            setSuccess('Payment recorded successfully');
            setTimeout(() => {
                handleClose();
                // Refresh data
                const fetchData = async () => {
                    try {
                        setLoading(true);
                        if (activeTab === 0) {
                            const res = await paymentApi.getPayments({
                                page: paginationModel.page + 1,
                                limit: paginationModel.pageSize,
                            });
                            setPayments(res.data.data.payments.map(p => ({ ...p, id: p._id })));
                        } else {
                            const res = await paymentApi.getTechniciansWithBalances({
                                page: paginationModel.page + 1,
                                limit: paginationModel.pageSize
                            });
                            setTechniciansWithBalances(res.data.data.technicians.map(t => ({ ...t, id: t._id })));
                        }
                    } catch (err) {
                        setError('Failed to refresh data');
                    } finally {
                        setLoading(false);
                    }
                };
                fetchData();
            }, 1000);
        } catch (err) {
            const serverErrors = err.response?.data?.error?.details || {};
            const formattedErrors = {};

            Object.keys(serverErrors).forEach((field) => {
                formattedErrors[field] = serverErrors[field]?.message || serverErrors[field];
            });

            setFormErrors(formattedErrors);
            setError(err.response?.data?.message || 'Failed to record payment');
        }
    };

    // Columns for Payment History tab
    const paymentColumns = [
        { 
            field: 'technician', 
            headerName: 'Technician', 
            width: 180,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        <PersonIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body2">
                        {params.row.technician?.name || 'N/A'}
                    </Typography>
                </Box>
            )
        },
        { 
            field: 'amount', 
            headerName: 'Amount', 
            width: 120,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="bold" color="success.main">
                    ₹{params.value?.toLocaleString() || '0'}
                </Typography>
            )
        },
        { 
            field: 'method', 
            headerName: 'Method', 
            width: 130,
            renderCell: (params) => {
                const methodColors = {
                    cash: 'primary',
                    bank_transfer: 'secondary',
                    check: 'warning',
                    digital_wallet: 'info'
                };
                return (
                    <Chip 
                        label={params.value?.replace('_', ' ').toUpperCase() || 'N/A'} 
                        size="small"
                        color={methodColors[params.value] || 'default'}
                    />
                );
            }
        },
        { 
            field: 'reference', 
            headerName: 'Reference', 
            width: 150,
            renderCell: (params) => (
                <Typography variant="body2" fontFamily="monospace">
                    {params.value || 'N/A'}
                </Typography>
            )
        },
        { 
  field: 'receivedBy', 
  headerName: 'Received By', 
  width: 150,
  valueGetter: (params) => {
    console.log("receivedBy params:", params);
    return params.name || 'N/A';
  }
},
{ 
  field: 'collectedAt', 
  headerName: 'Date', 
  width: 150,
  valueGetter: (params) => {
    if (!params) return 'N/A';
    const date = new Date(params);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
},

        // {
        //     field: 'actions',
        //     headerName: 'Actions',
        //     width: 100,
        //     renderCell: (params) => (
        //         <Tooltip title="View Details">
        //             <IconButton 
        //                 onClick={() => handleViewDetails(params.row)}
        //                 color="primary"
        //                 size="small"
        //             >
        //                 <ViewIcon />
        //             </IconButton>
        //         </Tooltip>
        //     )
        // }
    ];

    // Columns for Technician Balances tab
    const balanceColumns = [
        { 
            field: 'name', 
            headerName: 'Technician', 
            width: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {params.row.name?.charAt(0) || 'T'}
                    </Avatar>
                    <Box>
                        <Typography variant="body2" fontWeight="medium">
                            {params.row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {params.row.phone}
                        </Typography>
                    </Box>
                </Box>
            )
        },
        { field: 'email', headerName: 'Email', width: 200 },
        { 
            field: 'outstandingBalance', 
            headerName: 'Outstanding Balance', 
            width: 180,
            renderCell: (params) => (
                <Typography 
                    variant="body2" 
                    fontWeight="bold" 
                    color={params.value > 0 ? "error.main" : "success.main"}
                >
                    ₹{(params.value || 0).toLocaleString()}
                </Typography>
            )
        },
        { 
            field: 'dueFromDiscounts', 
            headerName: 'Due from Discounts', 
            width: 150,
            renderCell: (params) => `₹${(params.value || 0).toLocaleString()}`
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 180,
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PaymentIcon />}
                    onClick={() => handlePaymentOpen(params.row)}
                    disabled={!params.row.outstandingBalance || params.row.outstandingBalance <= 0}
                    sx={{ minWidth: 140 }}
                >
                    Record Payment
                </Button>
            )
        }
    ];

    const renderPaymentForm = () => (
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <FormControl fullWidth error={!!formErrors.technicianId}>
                    <InputLabel>Technician *</InputLabel>
                    <Select
                        name="technicianId"
                        value={formData.technicianId}
                        onChange={handleTechnicianChange}
                        label="Technician *"
                    >
                        {technicians.map((tech) => (
                            <MenuItem key={tech._id} value={tech._id}>
                                {tech.name} (Balance: ₹{(tech.outstandingBalance || 0).toLocaleString()})
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>{formErrors.technicianId}</FormHelperText>
                </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
                <TextField
                    label="Amount *"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    fullWidth
                    InputProps={{
                        inputProps: { 
                            min: 0.01,
                            max: selectedTechnician?.outstandingBalance || 0,
                            step: 0.01
                        }
                    }}
                    error={!!formErrors.amount}
                    helperText={
                        formErrors.amount || 
                        (selectedTechnician && `Max: ₹${(selectedTechnician.outstandingBalance || 0).toLocaleString()}`)
                    }
                />
            </Grid>

            <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.method}>
                    <InputLabel>Payment Method *</InputLabel>
                    <Select
                        name="method"
                        value={formData.method}
                        onChange={handleChange}
                        label="Payment Method *"
                    >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                        <MenuItem value="check">Check</MenuItem>
                        <MenuItem value="digital_wallet">Digital Wallet</MenuItem>
                    </Select>
                    <FormHelperText>{formErrors.method}</FormHelperText>
                </FormControl>
            </Grid>

            <Grid item xs={12}>
                <TextField
                    label="Reference Number"
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    fullWidth
                    helperText="Transaction ID, Check number, etc."
                />
            </Grid>

            <Grid item xs={12}>
                <TextField
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    rows={3}
                    helperText="Optional payment notes"
                />
            </Grid>
        </Grid>
    );

    const renderPaymentDetails = () => {
        if (!paymentDetails) return null;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                        Payment Details
                    </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Technician</Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {paymentDetails.payment?.technician?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {paymentDetails.payment?.technician?.phone}
                    </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
                    <Typography variant="h5" color="success.main" fontWeight="bold">
                        ₹{(paymentDetails.payment?.amount || 0).toLocaleString()}
                    </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                    <Chip 
                        label={paymentDetails.payment?.method?.replace('_', ' ').toUpperCase() || 'N/A'} 
                        color="primary"
                    />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Reference</Typography>
                    <Typography variant="body1">{paymentDetails.payment?.reference || 'N/A'}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Received By</Typography>
                    <Typography variant="body1">{paymentDetails.payment?.receivedBy?.name}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                    <Typography variant="body1">
                        {paymentDetails.payment?.collectedAt ? 
                            new Date(paymentDetails.payment.collectedAt).toLocaleString() : 'N/A'
                        }
                    </Typography>
                </Grid>
                
                {paymentDetails.payment?.notes && (
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                            {paymentDetails.payment.notes}
                        </Typography>
                    </Grid>
                )}

                {paymentDetails.relatedPayments && paymentDetails.relatedPayments.length > 0 && (
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>
                            Recent Payments from Same Technician
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {paymentDetails.relatedPayments.map((payment, index) => (
                                <Box key={index} sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    py: 1,
                                    borderBottom: index < paymentDetails.relatedPayments.length - 1 ? 1 : 0,
                                    borderColor: 'divider'
                                }}>
                                    <Typography variant="body2">
                                        {new Date(payment.collectedAt).toLocaleDateString()}
                                    </Typography>
                                    <Typography variant="body2" fontWeight="medium">
                                        ₹{(payment.amount || 0).toLocaleString()}
                                    </Typography>
                                    <Chip 
                                        label={payment.method} 
                                        size="small" 
                                        variant="outlined"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Grid>
                )}
            </Grid>
        );
    };

    if (loading && technicians.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Payments Management</Typography>
                <Button
                    variant="contained"
                    startIcon={<PaymentIcon />}
                    onClick={() => handlePaymentOpen()}
                >
                    Record Payment
                </Button>
            </Box>

            {/* Success/Error Alerts */}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                        <Tab icon={<ReceiptIcon />} label="Payment History" />
                        <Tab icon={<BalanceIcon />} label="Technician Balances" />
                    </Tabs>

                    {activeTab === 0 && (
                        <DataGrid
                            rows={payments}
                            columns={paymentColumns}
                            rowCount={totalRows}
                            paginationMode="server"
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[10, 25, 50]}
                            loading={loading}
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell': {
                                    borderBottom: '1px solid',
                                    borderColor: 'divider'
                                }
                            }}
                        />
                    )}

                    {activeTab === 1 && (
                        <DataGrid
                            rows={techniciansWithBalances}
                            columns={balanceColumns}
                            rowCount={totalRows}
                            paginationMode="server"
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[10, 25, 50]}
                            loading={loading}
                            autoHeight
                            sx={{
                                '& .MuiDataGrid-cell': {
                                    borderBottom: '1px solid',
                                    borderColor: 'divider'
                                }
                            }}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Record Payment Modal */}
            <Modal open={openPaymentModal} onClose={handleClose}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '95vw', md: 600 },
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Typography variant="h6" gutterBottom>
                        Record New Payment
                    </Typography>

                    <form onSubmit={handleRecordPayment}>
                        {renderPaymentForm()}
                        
                        <Button 
                            type="submit" 
                            variant="contained" 
                            fullWidth 
                            sx={{ mt: 3 }}
                            startIcon={<PaymentIcon />}
                        >
                            Record Payment
                        </Button>
                    </form>
                </Box>
            </Modal>

            {/* Payment Details Modal */}
            <Modal open={openDetailsModal} onClose={handleClose}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '95vw', md: 600 },
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2
                }}>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>

                    {renderPaymentDetails()}
                </Box>
            </Modal>
        </Box>
    );
};

export default PaymentList;