import { useFormik } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Link, Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { AuthFormWrapper } from '../../components/Auth/AuthFormWrapper';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email').required('Required'),
      password: Yup.string().required('Required')
    }),
    onSubmit: async (values) => {
      try {
        await login(values);
        navigate('/dashboard');
      } catch (error) {
        console.log(error);
        formik.setErrors({ submit: error.response?.data?.message || error.response?.data?.error?.message || error.response?.data?.error?.details[0]?.message || 'Login failed' });
      }
    }
  });

  return (
    <AuthFormWrapper title="Login">
      <form onSubmit={formik.handleSubmit}>
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
          Sign In
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Link href="/register" variant="body2">
            Don't have an account? Sign Up
          </Link>
          <br />
          <Link href="/forgot-password" variant="body2">
            Forgot password?
          </Link>
        </Box>
      </form>
    </AuthFormWrapper>
  );
};

export default Login;