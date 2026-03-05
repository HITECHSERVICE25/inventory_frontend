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
  MenuItem,
  Typography,
  Autocomplete,
  CircularProgress as MuiCircularProgress,
  IconButton as MuiIconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import companyApi from '../../api/company';

import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';

const CompanyList = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    installationCharge: 0,
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: activeSearchTerm
      };
      const res = await companyApi.getCompanies(params);
      setCompanies(
        res.data.data.map((company, i) => ({
          ...company,
          sl_no: (paginationModel.page * paginationModel.pageSize) + i + 1,
          id: company._id,
        }))
      );
      setTotalRows(res.data.pagination.total);
    } catch (err) {
      setError('Failed to load companies');
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

  // Open modals
  const handleCreateOpen = () => {
    setFormData({ name: '', installationCharge: 0 });
    setOpenCreateModal(true);
  };


  const handleEditOpen = (company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      installationCharge: company.installationCharge || 0,
    });
    setOpenEditModal(true);
  };


  const handleClose = () => {
    setOpenCreateModal(false);
    setOpenEditModal(false);
    setError('');
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };


  // Create a new company
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    try {
      await companyApi.createCompany(formData);
      handleClose();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company');
    } finally {
      setFormLoading(false);
    }
  };

  // Update an existing company
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setFormLoading(true);
    setError('');
    try {
      await companyApi.updateCompany(selectedCompany._id, formData);
      handleClose();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  // const handleDelete = async (id) => {
  // console.log(id);

  //   if (window.confirm('Are you sure you want to delete this company?')) {
  //     try {
  //       await companyApi.deleteCompany(id);
  //       fetchData();
  //     } catch (err) {
  //       setError('Failed to delete company');
  //     }
  //   }
  // };

  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = async (id) => {

  try {
    await companyApi.deleteCompany(id);
    setDeleteId(null)
    fetchData();
  } catch (err) {
    console.error(err);
    setError('Failed to delete company');
  }
};

  // Columns for DataGrid
  const columns = [
    { field: 'sl_no', headerName: 'Sl No.', width: 100 },
    { field: 'name', headerName: 'Company Name', flex: 1, minWidth: 200 },
    {
      field: 'installationCharge',
      headerName: 'Installation Charge (₹)',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      minWidth: 180,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Edit">
            <IconButton onClick={() => handleEditOpen(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              onClick={(e) => {
                // e.preventDefault();
  e.stopPropagation();
  setDeleteId(params.row.id);
              }}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];


  // Render form fields
  const renderFormFields = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          label="Company Name*"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          required
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          label="Installation Charge (₹)*"
          name="installationCharge"
          type="number"
          value={formData.installationCharge}
          onChange={handleChange}
          fullWidth
          required
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Grid>
    </Grid>
  );


  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', width: '100%', display: 'flex', flexDirection: 'column' }}>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Typography variant="h5">Companies</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search companies..."
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
            Add Company
          </Button>
        </Box>
      </Box>

      <Paper sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          rows={companies}
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
            position: 'relative',
            maxWidth: { xs: '95vw', md: 500 },
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <IconButton aria-label="close" onClick={handleClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <CloseIcon />
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
              {formLoading ? "Creating..." : "Create Company"}
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
            position: 'relative',
            maxWidth: { xs: '95vw', md: 500 },
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <IconButton aria-label="close" onClick={handleClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <CloseIcon />
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
              {formLoading ? "Updating..." : "Update Company"}
            </Button>
          </form>
        </Box>
      </Modal>
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
  <DialogTitle>Delete Company</DialogTitle>
  <DialogContent>
    Are you sure you want to delete this company?
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteId(null)}>Cancel</Button>
    <Button
      color="error"
      onClick={() => handleDelete(deleteId)}
    >
      Delete
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default CompanyList;