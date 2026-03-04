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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../context/AuthContext';
import companyApi from '../../api/company';

const CompanyList = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    installationCharge: 0,
  });

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await companyApi.getCompanies({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        search: searchQuery
      });
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
    fetchCompanies();
  }, [paginationModel, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleSearchKeyDown = (e) => {
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
    try {
      e.preventDefault();
      await companyApi.createCompany(formData);
      handleClose();

      // Refresh data
      const res = await companyApi.getCompanies();
      setCompanies(
        res.data.data.map((company, i) => ({
          ...company,
          sl_no: i + 1,
          id: company._id,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company');
    }
  };

  // Update an existing company
  const handleUpdate = async (e) => {
    try {
      e.preventDefault();
      if (!selectedCompany) {
        throw new Error('No company selected for update');
      }

      await companyApi.updateCompany(selectedCompany._id, formData);
      handleClose();

      // Refresh data
      const res = await companyApi.getCompanies();
      setCompanies(
        res.data.data.map((company, i) => ({
          ...company,
          sl_no: i + 1,
          id: company._id,
        }))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update company');
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companyApi.deleteCompany(id);
        setCompanies(companies.filter((company) => company.id !== id));
      } catch (err) {
        setError('Failed to delete company');
      }
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
              onClick={() => handleDelete(params.row.id)}
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
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h5">Companies</Typography>
          <Button variant="contained" onClick={handleCreateOpen}>
            Add Company
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            label="Search Companies..."
            variant="outlined"
            size="small"
            value={searchInput}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            placeholder="Press Enter to search by name..."
            sx={{ width: 350 }}
          />

          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              height: 40,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Search
          </Button>

          {searchQuery && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setPaginationModel(prev => ({ ...prev, page: 0 }));
              }}
              sx={{ height: 40, textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
        </Box>

        {error && <Box sx={{ color: 'error.main', mb: 2 }}>{error}</Box>}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={companies}
          columns={columns}
          rowCount={totalRows}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25]}
          loading={loading}
          sx={{
            height: '100%',
            '& .MuiDataGrid-cell': {
              py: 1
            }
          }}
        />
      </Box>


      {/* Create Modal */}
      <Modal open={openCreateModal} onClose={handleClose}>
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
          <IconButton aria-label="close" onClick={handleClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CloseIcon />
          </IconButton>
          <form onSubmit={handleCreate}>
            {renderFormFields()}
            {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Create Company
            </Button>
          </form>
        </Box>
      </Modal>

      {/* Edit Modal */}
      <Modal open={openEditModal} onClose={handleClose}>
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
          <IconButton aria-label="close" onClick={handleClose} sx={{ position: 'absolute', top: 8, right: 8 }}>
            <CloseIcon />
          </IconButton>
          <form onSubmit={handleUpdate}>
            {renderFormFields()}
            {error && <div style={{ color: 'red', mt: 2 }}>{error}</div>}
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
              Update Company
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default CompanyList;