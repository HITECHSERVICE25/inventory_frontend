import { useFormik } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Link, MenuItem, Select, FormControl, InputLabel, Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { AuthFormWrapper } from '../../components/Auth/AuthFormWrapper';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { 
      name: '', 
      email: '', 
      password: '',
      role: 'user' // Default role
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Required'),
      email: Yup.string().email('Invalid email').required('Required'),
      password: Yup.string().min(6, 'Minimum 6 characters').required('Required'),
      role: Yup.string().oneOf(['user', 'supervisor', 'admin']).required('Role is required')
    }),
    onSubmit: async (values) => {
      try {
        // Only include role if user is admin
        const registrationData = user?.role === 'admin' ? values : {
          name: values.name,
          email: values.email,
          password: values.password
        };
        
        await register(registrationData);
        navigate('/dashboard');
      } catch (error) {
        console.log(error);
        formik.setErrors({ submit: error.response?.data?.message || error.response?.data?.error?.message || error.response?.data?.error?.details[0]?.message || 'Registration failed' });
      }
    }
  });

  return (
    <AuthFormWrapper title="Register">
      <form onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          label="Name"
          name="name"
          margin="normal"
          {...formik.getFieldProps('name')}
          error={formik.touched.name && Boolean(formik.errors.name)}
          helperText={formik.touched.name && formik.errors.name}
        />

        <TextField
          fullWidth
          label="Email"
          name="email"
          margin="normal"
          {...formik.getFieldProps('email')}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          name="password"
          margin="normal"
          {...formik.getFieldProps('password')}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
        />

        {/* Role selection - only visible to admins */}
        {user?.role === 'admin' && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              error={formik.touched.role && Boolean(formik.errors.role)}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="supervisor">Supervisor</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        )}

        {formik.errors.submit && (
          <Typography color="error" sx={{ mt: 1 }}>
            {formik.errors.submit}
          </Typography>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Sign Up
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Link href="/login" variant="body2">
            Already have an account? Sign In
          </Link>
        </Box>
      </form>
    </AuthFormWrapper>
  );
};

export default Register;