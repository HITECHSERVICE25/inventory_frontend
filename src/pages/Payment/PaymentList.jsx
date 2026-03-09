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
    Autocomplete,
    Divider,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import CloseIcon from '@mui/icons-material/Close';
import {
    Receipt as ReceiptIcon,
    Visibility as ViewIcon,
    Payment as PaymentIcon,
    AccountBalance as BalanceIcon,
    Person as PersonIcon,
    Search as SearchIcon,
    TrendingUp as TrendingUpIcon,
    History as HistoryIcon,
    Add as AddIcon,
    FileDownload as DownloadIcon,
    FilterList as FilterIcon
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

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

    const [stats, setStats] = useState({
        totalCollected: 0,
        monthlyCollected: 0,
        totalOutstanding: 0,
        transactionCount: 0
    });

    const modalStyle = {
        position: 'relative',
        width: { xs: '95%', md: 600 },
        mx: 'auto',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 3,
        maxHeight: '90vh',
        overflowY: 'auto'
    };

    const modalContainerSx = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
    };

    const loadStats = async () => {
        try {
            const reportRes = await paymentApi.generatePaymentReport();
            const { totalCollected, transactionCount, monthlyCollected } = reportRes.data.data || {};

            // Getting total outstanding from all technicians
            const techRes = await technicianApi.getTechnicians({ limit: 1000 });
            const allTechs = techRes.data.data || [];
            const outstanding = allTechs.reduce((sum, t) => sum + (t.outstandingBalance || 0), 0);

            setStats({
                totalCollected: totalCollected || 0,
                transactionCount: transactionCount || 0,
                monthlyCollected: monthlyCollected || 0,
                totalOutstanding: outstanding
            });
        } catch (err) {
            console.error('Stats load error:', err);
        }
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

            // Load stats concurrently
            loadStats();
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

        if (formData.method && formData.method !== 'cash' && !formData.reference) {
            errors.reference = 'Reference number is required for non-cash payments';
        }

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
            flex: 1.5,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Avatar sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem',
                        fontWeight: 'bold'
                    }}>
                        {params.row.technician?.name?.charAt(0) || 'T'}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight="600" noWrap>
                            {params.row.technician?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {params.row.technician?.phone || ''}
                        </Typography>
                    </Box>
                </Box>
            )
        },
        {
            field: 'amount',
            headerName: 'Amount',
            width: 130,
            renderCell: (params) => (
                <Typography variant="body2" fontWeight="700" color="success.main">
                    ₹{params.value?.toLocaleString() || '0'}
                </Typography>
            )
        },
        {
            field: 'method',
            headerName: 'Method',
            width: 140,
            renderCell: (params) => {
                const methodConfig = {
                    cash: { color: 'success', label: 'CASH' },
                    bank_transfer: { color: 'primary', label: 'BANK TRANSFER' },
                    check: { color: 'warning', label: 'CHECK' },
                    online: { color: 'secondary', label: 'ONLINE' }
                };
                const config = methodConfig[params.value] || { color: 'default', label: params.value?.toUpperCase() || 'N/A' };
                return (
                    <Chip
                        label={config.label}
                        size="small"
                        color={config.color}
                        variant="outlined"
                        sx={{ fontWeight: '600', fontSize: '0.65rem', borderRadius: 1 }}
                    />
                );
            }
        },
        {
            field: 'reference',
            headerName: 'Ref #',
            width: 150,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    {params.value || '--'}
                </Typography>
            )
        },
        {
            field: 'receivedBy',
            headerName: 'Auditor',
            width: 150,
            renderCell: (params) => (
                <Typography variant="body2" color="text.secondary">
                    {params.row.receivedBy?.name || 'Admin'}
                </Typography>
            )
        },
        {
            field: 'collectedAt',
            headerName: 'Date',
            width: 120,
            renderCell: (params) => (
                <Typography variant="body2" color="text.secondary">
                    {params.value ? new Date(params.value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </Typography>
            )
        },
        {
            field: 'actions',
            headerName: '',
            width: 80,
            sortable: false,
            renderCell: (params) => (
                <IconButton
                    onClick={() => handleViewDetails(params.row)}
                    color="primary"
                    size="small"
                    sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                >
                    <ViewIcon fontSize="small" />
                </IconButton>
            )
        }
    ];

    // Columns for Technician Balances tab
    const balanceColumns = [
        {
            field: 'name',
            headerName: 'Technician',
            flex: 1.5,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 'bold', fontSize: '0.875rem' }}>
                        {params.row.name?.charAt(0) || 'T'}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight="600" noWrap>
                            {params.row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {params.row.phone}
                        </Typography>
                    </Box>
                </Box>
            )
        },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
        {
            field: 'outstandingBalance',
            headerName: 'Outstanding',
            width: 150,
            renderCell: (params) => (
                <Box sx={{ textAlign: 'right', width: '100%' }}>
                    <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={params.value > 0 ? "error.main" : "success.main"}
                    >
                        ₹{(params.value || 0).toLocaleString()}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'actions',
            headerName: '',
            width: 180,
            sortable: false,
            renderCell: (params) => (
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PaymentIcon />}
                    onClick={() => handlePaymentOpen(params.row)}
                    disabled={!params.row.outstandingBalance || params.row.outstandingBalance <= 0}
                    sx={{
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        bgcolor: 'primary.main',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
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
                        <MenuItem value="online">Online Payment</MenuItem>
                    </Select>
                    {formErrors.method && <FormHelperText>{formErrors.method}</FormHelperText>}
                </FormControl>
            </Grid>

            <Grid item xs={12}>
                <TextField
                    label={`Reference Number ${formData.method === 'cash' ? '' : '*'}`}
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    fullWidth
                    helperText={formErrors.reference || "Transaction ID, Check number, etc."}
                    error={!!formErrors.reference}
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

        const detailRow = (label, value, isBold = false, color = 'text.primary') => (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={isBold ? 'bold' : '500'} color={color}>{value}</Typography>
            </Box>
        );

        return (
            <Box>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={5}>
                        <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'grey.50', borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
                            <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {paymentDetails.technician?.name?.charAt(0) || 'T'}
                            </Avatar>
                            <Typography variant="h6" fontWeight="bold">{paymentDetails.technician?.name}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>{paymentDetails.technician?.phone}</Typography>
                            <Chip
                                label={paymentDetails.status?.toUpperCase() || 'N/A'}
                                color={paymentDetails.status === 'collected' ? 'success' : 'warning'}
                                size="small"
                                sx={{ mt: 1, fontWeight: 'bold', borderRadius: 1 }}
                            />
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.light', display: 'inline-block' }}>
                            Transaction Summary
                        </Typography>

                        {detailRow('Amount Paid', `₹${(paymentDetails.amount || 0).toLocaleString()}`, true, 'success.main')}
                        {detailRow('Payment Method', paymentDetails.method?.replace(/_/g, ' ').toUpperCase() || 'N/A')}
                        {detailRow('Reference Number', paymentDetails.reference || 'N/A')}
                        {detailRow('Transaction Date', paymentDetails.collectedAt ? new Date(paymentDetails.collectedAt).toLocaleString() : 'N/A')}

                        <Divider sx={{ my: 2 }} />

                        {detailRow('Recorded By', paymentDetails.receivedBy?.name || 'Admin')}
                        {detailRow('Creation Date', paymentDetails.createdAt ? new Date(paymentDetails.createdAt).toLocaleString() : 'N/A')}
                    </Grid>

                    {paymentDetails.notes && (
                        <Grid item xs={12}>
                            <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                                <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
                                    Notes
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                    "{paymentDetails.notes}"
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Box>
        );
    };

    const renderStatsCards = () => (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
                { label: 'Total Collected', value: stats.totalCollected, icon: <TrendingUpIcon />, color: '#10b981' },
                { label: 'Monthly Collection', value: stats.monthlyCollected, icon: <ReceiptIcon />, color: '#3b82f6' },
                { label: 'Outstanding Total', value: stats.totalOutstanding, icon: <BalanceIcon />, color: '#f59e0b' },
                { label: 'Transactions', value: stats.transactionCount, icon: <HistoryIcon />, color: '#8b5cf6', isCount: true }
            ].map((card, index) => (
                <Grid item xs={12} sm={6} md={6} key={index}>
                    <Card sx={{
                        height: '100%',
                        borderRadius: 3,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'translateY(-4px)' }
                    }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{
                                bgcolor: `${card.color}15`,
                                color: card.color,
                                p: 1.5,
                                borderRadius: 2,
                                display: 'flex',
                                mr: 2
                            }}>
                                {card.icon}
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {card.label}
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                    {card.isCount ? card.value : `₹${card.value.toLocaleString()}`}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Payments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage technician balances and track payment history
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handlePaymentOpen()}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            textTransform: 'none',
                            fontWeight: '600',
                            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        Record Payment
                    </Button>
                </Box>
            </Box>

            {/* Stats Overview */}
            {renderStatsCards()}

            {/* Main Content Area */}
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} sx={{
                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: '600', minWidth: 120 }
                    }}>
                        <Tab label="Payment History" />
                        <Tab label="Technician Balances" />
                    </Tabs>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    bgcolor: 'grey.50',
                                    '& fieldset': { borderColor: 'transparent' },
                                    '&:hover fieldset': { borderColor: 'divider' },
                                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                                }
                            }}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                            }}
                        />
                        {activeTab === 0 && (
                            <DateRangeExport
                                title="Export"
                                filePrefix="Payments"
                                exportApi={paymentApi.exportPayments}
                            />
                        )}
                    </Box>
                </Box>

                <CardContent sx={{ p: 0 }}>
                    {/* Alerts */}
                    {(success || error) && (
                        <Box sx={{ p: 2 }}>
                            {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: 2 }}>{success}</Alert>}
                            {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
                        </Box>
                    )}

                    <Box sx={{ height: 600, width: '100%' }}>
                        {isMobile ? (
                            <Box sx={{ overflowY: 'auto', p: 1, height: '100%' }}>
                                {activeTab === 0 ? (
                                    payments.map((p) => (
                                        <Card key={p.id} sx={{ mb: 2 }}>
                                            <CardContent>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="subtitle1" fontWeight="bold">{p.technician?.name}</Typography>
                                                    <Typography variant="subtitle1" color="success.main" fontWeight="bold">₹{p.amount}</Typography>
                                                </Box>
                                                <Typography variant="body2" color="textSecondary">Method: {p.method?.replace('_', ' ').toUpperCase()}</Typography>
                                                <Typography variant="body2" color="textSecondary">Ref: {p.reference || '--'}</Typography>
                                                <Typography variant="caption" color="textSecondary">Date: {new Date(p.collectedAt).toLocaleDateString()}</Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                    <IconButton onClick={() => handleViewDetails(p)} color="primary" size="small">
                                                        <ViewIcon />
                                                    </IconButton>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    techniciansWithBalances.map((t) => (
                                        <Card key={t.id} sx={{ mb: 2 }}>
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight="bold">{t.name}</Typography>
                                                <Typography variant="body2" color="textSecondary">Outstanding:
                                                    <Typography component="span" fontWeight="bold" color={t.outstandingBalance > 0 ? "error.main" : "success.main"} sx={{ ml: 1 }}>
                                                        ₹{(t.outstandingBalance || 0).toLocaleString()}
                                                    </Typography>
                                                </Typography>
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        startIcon={<PaymentIcon />}
                                                        onClick={() => handlePaymentOpen(t)}
                                                        disabled={!t.outstandingBalance || t.outstandingBalance <= 0}
                                                    >
                                                        Record
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                                {((activeTab === 0 && payments.length === 0) || (activeTab === 1 && techniciansWithBalances.length === 0)) && !loading && (
                                    <Typography align="center" sx={{ mt: 4 }}>No data found</Typography>
                                )}
                            </Box>
                        ) : (
                            <DataGrid
                                rows={activeTab === 0 ? payments : techniciansWithBalances}
                                columns={activeTab === 0 ? paymentColumns : balanceColumns}
                                rowCount={totalRows}
                                paginationMode="server"
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[10, 25, 50]}
                                loading={loading}
                                disableSelectionOnClick
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-columnHeaders': {
                                        bgcolor: 'grey.50',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                    },
                                    '& .MuiDataGrid-cell': {
                                        borderBottom: '1px solid',
                                        borderColor: 'grey.100',
                                    },
                                    '& .MuiDataGrid-row:hover': {
                                        bgcolor: 'grey.50',
                                    },
                                    '& .MuiDataGrid-footerContainer': {
                                        borderTop: '1px solid',
                                        borderColor: 'divider',
                                    }
                                }}
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Record Payment Modal */}
            <Modal
                open={openPaymentModal}
                onClose={handleClose}
                sx={modalContainerSx}
            >
                <Box sx={modalStyle}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" fontWeight="bold">Record New Payment</Typography>
                        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
                    </Box>

                    <form onSubmit={handleRecordPayment}>
                        {renderPaymentForm()}
                        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                            <Button variant="outlined" fullWidth onClick={handleClose} sx={{ borderRadius: 2, textTransform: 'none' }}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={formLoading}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: '600' }}
                            >
                                {formLoading ? <CircularProgress size={24} /> : "Record Payment"}
                            </Button>
                        </Box>
                    </form>
                </Box>
            </Modal>

            {/* Payment Details Modal */}
            <Modal
                open={openDetailsModal}
                onClose={handleClose}
                sx={modalContainerSx}
            >
                <Box sx={{ ...modalStyle, p: 0, overflow: 'hidden' }}>
                    <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <Typography variant="h6" fontWeight="bold">Payment Transaction</Typography>
                        <IconButton onClick={handleClose} size="small" sx={{ color: 'inherit' }}><CloseIcon /></IconButton>
                    </Box>
                    <Box sx={{ p: 4 }}>
                        {renderPaymentDetails()}
                    </Box>
                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', bgcolor: 'grey.50' }}>
                        <Button onClick={handleClose} variant="contained" sx={{ borderRadius: 2, textTransform: 'none' }}>Close</Button>
                    </Box>
                </Box>
            </Modal>
        </Box>
    );
};

export default PaymentList;