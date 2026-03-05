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
    Avatar,
    Autocomplete
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
import DateRangeExport from '../../components/DateRangeExport';

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
    const [formLoading, setFormLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchTerm, setActiveSearchTerm] = useState('');

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
        technician: null,
        amount: '',
        method: 'bank_transfer',
        reference: '',
        notes: ''
    });

    const modalStyle = {
        position: 'relative',
        width: { xs: '95vw', md: 600 },
        maxHeight: '90vh',
        overflowY: 'auto',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 0) {
                const paymentParams = {
                    page: paginationModel.page + 1,
                    limit: paginationModel.pageSize,
                    search: activeSearchTerm
                };
                const paymentRes = await paymentApi.getPayments(paymentParams);
                setPayments(paymentRes.data.data.payments.map(p => ({ ...p, id: p._id })));
                setTotalRows(paymentRes.data.data.pagination.total);
            } else {
                const balanceRes = await paymentApi.getTechniciansWithBalances({
                    page: paginationModel.page + 1,
                    limit: paginationModel.pageSize,
                    search: activeSearchTerm
                });
                setTechniciansWithBalances(balanceRes.data.data.technicians.map(t => ({ ...t, id: t._id })));
                setTotalRows(balanceRes.data.data.pagination.total);
            }
            const techRes = await technicianApi.getTechnicians({ limit: 1000 });
            setTechnicians(techRes.data.data);
        } catch (err) {
            setError('Failed to load data: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [paginationModel, activeTab, activeSearchTerm]);

    const handleSearchClick = () => {
        setActiveSearchTerm(searchTerm);
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        setPaginationModel({ page: 0, pageSize: 10 });
    };

    const handlePaymentOpen = (technician = null) => {
        if (technician) {
            setFormData({
                technician: technician,
                amount: technician.outstandingBalance.toFixed(2),
                method: 'bank_transfer',
                reference: '',
                notes: ''
            });
            setSelectedTechnician(technician);
        } else {
            setFormData({
                technician: null,
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

    const handleTechnicianChange = (event, newValue) => {
        setFormData({
            ...formData,
            technician: newValue,
            amount: newValue ? newValue.outstandingBalance : ''
        });
        setSelectedTechnician(newValue);
        setFormErrors({ ...formErrors, technician: null, amount: null });
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.technician) errors.technician = 'Technician is required';
        if (!formData.amount || formData.amount <= 0) errors.amount = 'Valid amount is required';

        const technician = formData.technician;
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
            setFormLoading(true);
            setError('');
            const paymentData = {
                amount: parseFloat(formData.amount),
                method: formData.method,
                reference: formData.reference,
                notes: formData.notes,
                receivedBy: user._id
            };

            await paymentApi.recordPayment(formData.technician._id, paymentData);

            setSuccess('Payment recorded successfully');
            setTimeout(() => {
                handleClose();
                // Refresh data
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
        } finally {
            setFormLoading(false);
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
                //console.log("receivedBy params:", params);
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

        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            renderCell: (params) => (
                <Tooltip title="View Details">
                    <IconButton
                        onClick={() => handleViewDetails(params.row)}
                        color="primary"
                        size="small"
                    >
                        <ViewIcon />
                    </IconButton>
                </Tooltip>
            )
        }
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
                <Autocomplete
                    options={technicians}
                    getOptionLabel={(option) => `${option.name} (Balance: ₹${(option.outstandingBalance || 0).toLocaleString()})`}
                    value={formData.technician}
                    onChange={handleTechnicianChange}
                    isOptionEqualToValue={(option, value) => option._id === value?._id}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Technician *"
                            error={!!formErrors.technician}
                            helperText={formErrors.technician}
                            fullWidth
                        />
                    )}
                />
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
                    {formErrors.method && <FormHelperText>{formErrors.method}</FormHelperText>}
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

    // const renderPaymentDetails = () => {
    //     if (!paymentDetails) return null;

    //     console.log(paymentDetails);

    //     return (
    //         <Grid container spacing={3}>
    //             <Grid item xs={12}>
    //                 <Typography variant="h6" gutterBottom color="primary">
    //                     Payment Details
    //                 </Typography>
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Technician</Typography>
    //                 <Typography variant="body1" fontWeight="medium">
    //                     {paymentDetails.payment?.technician?.name}
    //                 </Typography>
    //                 <Typography variant="body2" color="text.secondary">
    //                     {paymentDetails.payment?.technician?.phone}
    //                 </Typography>
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Amount</Typography>
    //                 <Typography variant="h5" color="success.main" fontWeight="bold">
    //                     ₹{(paymentDetails.payment?.amount || 0).toLocaleString()}
    //                 </Typography>
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
    //                 <Chip
    //                     label={paymentDetails.payment?.method?.replace('_', ' ').toUpperCase() || 'N/A'}
    //                     color="primary"
    //                 />
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Reference</Typography>
    //                 <Typography variant="body1">{paymentDetails.payment?.reference || 'N/A'}</Typography>
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Received By</Typography>
    //                 <Typography variant="body1">{paymentDetails.payment?.receivedBy?.name}</Typography>
    //             </Grid>

    //             <Grid item xs={12} sm={6}>
    //                 <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
    //                 <Typography variant="body1">
    //                     {paymentDetails.payment?.collectedAt ?
    //                         new Date(paymentDetails.payment.collectedAt).toLocaleString() : 'N/A'
    //                     }
    //                 </Typography>
    //             </Grid>

    //             {paymentDetails.payment?.notes && (
    //                 <Grid item xs={12}>
    //                     <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
    //                     <Typography variant="body1" sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
    //                         {paymentDetails.payment.notes}
    //                     </Typography>
    //                 </Grid>
    //             )}

    //             {paymentDetails.relatedPayments && paymentDetails.relatedPayments.length > 0 && (
    //                 <Grid item xs={12}>
    //                     <Typography variant="subtitle1" gutterBottom>
    //                         Recent Payments from Same Technician
    //                     </Typography>
    //                     <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
    //                         {paymentDetails.relatedPayments.map((payment, index) => (
    //                             <Box key={index} sx={{
    //                                 display: 'flex',
    //                                 justifyContent: 'space-between',
    //                                 alignItems: 'center',
    //                                 py: 1,
    //                                 borderBottom: index < paymentDetails.relatedPayments.length - 1 ? 1 : 0,
    //                                 borderColor: 'divider'
    //                             }}>
    //                                 <Typography variant="body2">
    //                                     {new Date(payment.collectedAt).toLocaleDateString()}
    //                                 </Typography>
    //                                 <Typography variant="body2" fontWeight="medium">
    //                                     ₹{(payment.amount || 0).toLocaleString()}
    //                                 </Typography>
    //                                 <Chip
    //                                     label={payment.method}
    //                                     size="small"
    //                                     variant="outlined"
    //                                 />
    //                             </Box>
    //                         ))}
    //                     </Box>
    //                 </Grid>
    //             )}
    //         </Grid>
    //     );
    // };

    const renderPaymentDetails = () => {
        if (!paymentDetails) return null;

        return (
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom color="primary">
                        Payment Details
                    </Typography>
                </Grid>

                {/* Technician Info */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Technician
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                        {paymentDetails.technician?.name || "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {paymentDetails.technician?.phone || ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {paymentDetails.technician?.email || ""}
                    </Typography>
                </Grid>

                {/* Amount */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Amount
                    </Typography>
                    <Typography variant="h5" color="success.main" fontWeight="bold">
                        ₹{(paymentDetails.amount || 0).toLocaleString()}
                    </Typography>
                </Grid>

                {/* Method */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Payment Method
                    </Typography>
                    <Chip
                        label={
                            paymentDetails.method
                                ? paymentDetails.method.replace(/_/g, " ").toUpperCase()
                                : "N/A"
                        }
                        color="primary"
                        variant="outlined"
                    />
                </Grid>

                {/* Status */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Status
                    </Typography>
                    <Chip
                        label={paymentDetails.status?.toUpperCase() || "N/A"}
                        color={paymentDetails.status === "collected" ? "success" : "warning"}
                    />
                </Grid>

                {/* Reference */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Reference
                    </Typography>
                    <Typography variant="body1">
                        {paymentDetails.reference || "N/A"}
                    </Typography>
                </Grid>

                {/* Received By */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Received By
                    </Typography>
                    <Typography variant="body1">
                        {paymentDetails.receivedBy?.name || "N/A"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {paymentDetails.receivedBy?.email || ""}
                    </Typography>
                </Grid>

                {/* Collected Date */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Collected At
                    </Typography>
                    <Typography variant="body1">
                        {paymentDetails.collectedAt
                            ? new Date(paymentDetails.collectedAt).toLocaleString()
                            : "N/A"}
                    </Typography>
                </Grid>

                {/* Created Date */}
                <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Created At
                    </Typography>
                    <Typography variant="body1">
                        {paymentDetails.createdAt
                            ? new Date(paymentDetails.createdAt).toLocaleString()
                            : "N/A"}
                    </Typography>
                </Grid>

                {/* Notes */}
                {paymentDetails.notes && (
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Notes
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{ p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {paymentDetails.notes}
                        </Typography>
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
        <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5">Payments Management</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                    />
                    <Button
                        variant="contained"
                        startIcon={<PaymentIcon />}
                        onClick={() => handlePaymentOpen()}
                    >
                        Record Payment
                    </Button>
                </Box>
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

            <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                        <Tab icon={<ReceiptIcon />} label="Payment History" />
                        <Tab icon={<BalanceIcon />} label="Technician Balances" />
                    </Tabs>

                    {activeTab === 0 && (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <DateRangeExport
                                title="Export Payment"
                                filePrefix="Payment"
                                exportApi={paymentApi.exportPayments}
                            />
                            <DataGrid
                                rows={payments}
                                columns={paymentColumns}
                                rowCount={totalRows}
                                paginationMode="server"
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
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
                                    borderColor: 'divider'
                                }}
                            />
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <DataGrid
                                rows={techniciansWithBalances}
                                columns={balanceColumns}
                                rowCount={totalRows}
                                paginationMode="server"
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
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
                                    borderColor: 'divider'
                                }}
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Record Payment Modal */}
            <Modal
                open={openPaymentModal}
                onClose={handleClose}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}
            >
                <Box sx={modalStyle}>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Typography variant="h6" gutterBottom>
                        Record New Payment
                    </Typography>

                    <form onSubmit={handleRecordPayment}>
                        {renderPaymentForm()}
                        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 3 }}
                            startIcon={formLoading ? <CircularProgress size={20} color="inherit" /> : <PaymentIcon />}
                            disabled={formLoading}
                        >
                            {formLoading ? "Recording..." : "Record Payment"}
                        </Button>
                    </form>
                </Box>
            </Modal>

            {/* Payment Details Modal */}
            <Modal
                open={openDetailsModal}
                onClose={handleClose}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}
            >
                <Box sx={modalStyle}>
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
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