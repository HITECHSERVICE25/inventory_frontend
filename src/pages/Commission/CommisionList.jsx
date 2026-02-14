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
    FormHelperText
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

    // Fetch commissions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const params = {
                    page: paginationModel.page + 1,
                    limit: paginationModel.pageSize
                };
                const res = await commissionApi.getCommissions(params);

                // console.log("res:", res);
                
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
        fetchData();
    }, [paginationModel]);

    // Fetch products and technicians
    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [productsRes, techniciansRes] = await Promise.all([
                    productApi.getProducts(),
                    technicianApi.getTechnicians()
                ]);
                setProducts(productsRes.data.data);
                setTechnicians(techniciansRes.data.data);
            } catch (err) {
                setError('Failed to load resources');
            }
        };
        fetchResources();
    }, []);

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
          productId: commission.product._id, // Use product._id instead of productId
          technicianId: commission.technician._id, // Use technician._id instead of technicianId
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
            <FormControl fullWidth error={!!formErrors.technicianId} disabled={openEditModal}>
              <InputLabel>Technician*</InputLabel>
              <Select
                name="technicianId"
                value={formData.technicianId || ''}
                onChange={handleChange}
                renderValue={(selected) => {
                  const selectedTechnician = technicians.find((t) => t._id === selected);
                  return selectedTechnician ? selectedTechnician.name : '';
                }}
                disabled={openEditModal} // Disable in edit mode
              >
                {technicians?.map((technician) => (
                  <MenuItem key={technician._id} value={technician._id}>
                    {technician.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{formErrors.technicianId}</FormHelperText>
            </FormControl>
          </Grid>
      
          {/* Product Selection (disabled in edit mode) */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!formErrors.productId} disabled={openEditModal}>
              <InputLabel>Product*</InputLabel>
              <Select
                name="productId"
                value={formData.productId || ''}
                onChange={handleChange}
                renderValue={(selected) => {
                  const selectedProduct = products.find((p) => p._id === selected);
                  return selectedProduct ? selectedProduct.name : '';
                }}
                disabled={openEditModal} // Disable in edit mode
              >
                {products?.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{formErrors.productId}</FormHelperText>
            </FormControl>
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
              InputProps={{ inputProps: { min: 0 } }}
              error={!!formErrors.commissionAmount}
              helperText={formErrors.commissionAmount}
            />
          </Grid>
        </Grid>
      );

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Commissions</Typography>
                <Button variant="contained" onClick={handleCreateOpen}>
                    Add Commission
                </Button>
            </Box>

            {/* Commissions DataGrid */}
            <div>
                <DataGrid
                    rows={commissions}
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