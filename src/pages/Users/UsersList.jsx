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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/auth';
import { DataGrid } from '@mui/x-data-grid';
import { Cancel, Edit, Save } from '@mui/icons-material';

import InputAdornment from "@mui/material/InputAdornment";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";


const UsersList = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
   const [openEditModal, setOpenEditModal] = useState(false);
     const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showPassword, setShowPassword] = useState(false);

const handleTogglePassword = () => {
  setShowPassword((prev) => !prev);
};


      const fetchUsers = async () => {
      try {
        const res = await api.getUsers();
        setUsers(res.data.data.map((el, i) => ({...el, sl_no: i + 1, id: el._id})));
      } catch (err) {
        console.log(err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {

    
    fetchUsers();
  }, []);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
    setError('');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.register(formData);
      handleCloseModal();
      // Refresh user list
      const res = await api.getUsers();
      setUsers(res.data.data.map((el, i) => ({...el, sl_no: i + 1, id: el._id})));
    } catch (err) {
  const apiError = err.response?.data?.error;

  if (apiError?.details?.length > 0) {
    // Show first validation error
    setError(apiError.details[0].message);
  } else if (apiError?.message) {
    setError(apiError.message);
  } else {
    setError("Failed to update user");
  }
}

  };

  const handleOpenEditModal = (userData, params) => {
    //console.log(userData, params);
    setSelectedUser(userData);
    setFormData({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      password: '' // Don't pre-fill password
    });
    setOpenEditModal(true);
  };

  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedUser(null);
    setError('');
    setSuccess('');
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Remove password if empty (don't update password unless specified)
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      await api.updateUser(selectedUser._id, updateData);
      setSuccess('User updated successfully');
      setTimeout(() => {
        handleCloseEditModal();
        fetchUsers();
      }, 1000);
    } catch (err) {
  const apiError = err.response?.data?.error;

  if (apiError?.details?.length > 0) {
    // Show first validation error
    setError(apiError.details[0].message);
  } else if (apiError?.message) {
    setError(apiError.message);
  } else {
    setError("Failed to update user");
  }
}

  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ height: 400, width: '100%' }}>


<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Users</Typography>
              {user.role == "admin" && <Button variant="contained" onClick={handleOpenModal}>
    Add User
  </Button>}
            </Box>

      <DataGrid
        rows={users}
        columns={[
          { field: 'sl_no', headerName: 'Sl No.', width: 100 },
          { field: 'name', headerName: 'Name', width: 150 },
          { field: 'email', headerName: 'Email', width: 250 },
          { field: 'role', headerName: 'Role', width: 150 },
          { field: 'createdAt', headerName: 'Date', width: 200, valueFormatter: (params) => new Date(params).toLocaleDateString() },
        user.role == "admin" && {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      renderCell: (params) => (
        <Box>
          <IconButton 
            color="primary" 
            onClick={() => handleOpenEditModal(params.row, params)}
            size="small"
          >
            <Edit />
          </IconButton>
          
        </Box>
      ),
    }
        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 10]}
      />

      {/* Add User Modal */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="add-user-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
  label="Password"
  name="password"
  type={showPassword ? "text" : "password"}
  value={formData.password}
  onChange={handleChange}
  fullWidth
  required
  sx={{ mb: 2 }}
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={handleTogglePassword}
          edge="end"
          tabIndex={-1}
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  }}
/>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" fullWidth>
              Create User
            </Button>
          </form>
        </Box>
      </Modal>

      <Dialog open={openEditModal} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleEditSubmit}>
            <TextField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2, mt: 2 }}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
  label="New Password (leave blank to keep current)"
  name="password"
  type={showPassword ? "text" : "password"}
  value={formData.password}
  onChange={handleChange}
  fullWidth
  sx={{ mb: 2 }}
  helperText="Leave empty if you don't want to change the password"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={handleTogglePassword}
          edge="end"
          tabIndex={-1}
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  }}
/>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} startIcon={<Cancel />}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" startIcon={<Save />}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersList;