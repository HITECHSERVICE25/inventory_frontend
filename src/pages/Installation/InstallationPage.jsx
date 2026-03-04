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
  Typography,
  Chip,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import installationApi from '../../api/installation';
import { DataGrid } from '@mui/x-data-grid';

const InstallationPage = () => {
  const { user } = useAuth();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: ''
  });
  const [error, setError] = useState('');

  // Fetch installation charge history
  useEffect(() => {
    const fetchCharges = async () => {
      try {
        const res = await installationApi.getInstallationChargeHistory();
        setCharges(res.data.data.map((charge, i) => ({ ...charge, sl_no: i + 1, id: charge._id })));
      } catch (err) {
        console.log(err);
        setError('Failed to load installation charges');
      } finally {
        setLoading(false);
      }
    };

    fetchCharges();
  }, []);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
    setError('');
    setFormData({ amount: '' }); // Reset form
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await installationApi.createInstallationCharge(formData);
      handleCloseModal();

      // Refresh charges list
      const res = await installationApi.getInstallationChargeHistory();
      setCharges(res.data.data.map((charge, i) => ({ ...charge, sl_no: i + 1, id: charge._id })));
    } catch (err) {
      console.log(err);
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details[0]?.message ||
        'Failed to create installation charge'
      );
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      {/* Header with Title and Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Installation Charges</Typography>
        <Button variant="contained" onClick={handleOpenModal}>
          Add Charge
        </Button>
      </Box>

      {/* DataGrid for Installation Charges */}
      <DataGrid
        rows={charges}
        columns={[
          { field: 'sl_no', headerName: 'Sl No.', width: 100 },
          { field: 'amount', headerName: 'Amount', width: 150 },
          {
            field: 'isCurrent',
            headerName: 'Current',
            width: 150,
            renderCell: (params) => (
              params.value === true
                ? <Chip label="Yes" color="success" />
                : <Chip label="No" color="error" /> // "danger" isn't a valid color; use "error"
            )
          },
          { field: 'createdAt', headerName: 'Date', width: 200, valueFormatter: (params) => new Date(params).toLocaleDateString() },
        ]}
        disableRowSelectionOnClick // Optional: Disable row selection if not needed
        disableColumnMenu // Optional: Disable column menu for simplicity
        autoHeight // Ensures the grid adjusts height based on content [[3]]
        hideFooter
      />

      {/* Add Installation Charge Modal */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="add-installation-charge-modal"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <form onSubmit={handleSubmit}>
            <TextField
              label="Amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ min: 0 }} // Ensure positive number [[3]]
              sx={{ mb: 2 }}
            />

            {error && <div style={{ color: 'red' }}>{error}</div>}
            <Button type="submit" variant="contained" fullWidth>
              Create Charge
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default InstallationPage;