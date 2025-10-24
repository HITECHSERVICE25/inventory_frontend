import { useFormik } from 'formik';
import * as Yup from 'yup';
import { TextField, Button, Link } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { AuthFormWrapper } from '../../components/Auth/AuthFormWrapper';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email').required('Required')
    }),
    onSubmit: async (values) => {
      try {
        await forgotPassword(values.email);
        formik.setStatus({ success: true });
      } catch (error) {
        formik.setErrors({ submit: error.response?.data?.message || 'Request failed' });
      }
    }
  });

  return (
    <AuthFormWrapper title="Forgot Password">
      {formik.status?.success ? (
        <Typography>
          Password reset instructions have been sent to your email
        </Typography>
      ) : (
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
            Send Reset Instructions
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link href="/login" variant="body2">
              Remember your password? Sign In
            </Link>
          </Box>
        </form>
      )}
    </AuthFormWrapper>
  );
};

export default ForgotPassword;