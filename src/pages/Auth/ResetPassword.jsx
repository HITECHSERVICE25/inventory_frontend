import { useFormik } from 'formik';
import * as Yup from 'yup';
import { TextField, Button } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';
import { AuthFormWrapper } from '../../components/Auth/AuthFormWrapper';

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const { token } = useParams();

  const formik = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: Yup.object({
      password: Yup.string().min(6, 'Minimum 6 characters').required('Required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Required')
    }),
    onSubmit: async (values) => {
      try {
        await resetPassword(token, values.password);
        formik.setStatus({ success: true });
      } catch (error) {
        formik.setErrors({ submit: error.response?.data?.message || 'Password reset failed' });
      }
    }
  });

  return (
    <AuthFormWrapper title="Reset Password">
      {formik.status?.success ? (
        <Typography>
          Password reset successfully! You can now login with your new password
        </Typography>
      ) : (
        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            name="password"
            margin="normal"
            {...formik.getFieldProps('password')}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            margin="normal"
            {...formik.getFieldProps('confirmPassword')}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
            Reset Password
          </Button>
        </form>
      )}
    </AuthFormWrapper>
  );
};

export default ResetPassword;