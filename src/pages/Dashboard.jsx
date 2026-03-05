import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Box,
  Button,
  Divider,
  Chip,
} from "@mui/material";
import dashboardApi from "../api/dashboard";

const currency = (val) =>
  `₹ ${Number(val || 0).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await dashboardApi.getDashboard();
      setData(res.data.data);
    } catch (err) {
      console.error("Dashboard error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="contained" onClick={() => fetchDashboard()}>Retry</Button>
      </Box>
    );
  }

  if (!data) return null;

  const { kpis, orderTrend, inventory, technicians, payments } = data;

  const maxCount = Math.max(...orderTrend.map((d) => d.count), 1);

  return (
    <Box p={4}>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={2}
        mb={4}
      >
        <Typography variant="h4" fontWeight={600}>
          Dashboard Overview
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <Button
            variant="contained"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Box>
      </Box>

      {/* KPI CARDS */}
      <Grid container spacing={3} mb={4}>
        {[
          { label: "Total Orders", value: kpis.totalOrders },
          { label: "Completed Orders", value: kpis.completedOrders },
          { label: "Pending Approval", value: kpis.pendingApproval },
          // { label: "Total Revenue", value: currency(kpis.totalRevenue) },
          // { label: "Outstanding", value: currency(kpis.totalOutstanding) },
        ].map((item, i) => (
          <Grid item xs={12} sm={6} md={2.4} key={i}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={600} mt={1}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Orders Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Orders Trend (Last 5 Days)
              </Typography>

              <Box
                display="flex"
                alignItems="flex-end"
                height="220px"
                gap={3}
                mt={2}
              >
                {orderTrend.map((item, index) => (
                  <Box
                    key={index}
                    flex={1}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                  >
                    <Box
                      width="100%"
                      height={`${(item.count / maxCount) * 180}px`}
                      bgcolor="primary.main"
                      borderRadius={2}
                    />
                    <Typography variant="caption" mt={1}>
                      {item._id.slice(5)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.count} orders
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Side Summary */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Technician Summary */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Technicians
                  </Typography>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={`Active: ${technicians.active}`}
                      color="success"
                    />
                    <Chip
                      label={`Blocked: ${technicians.blocked}`}
                      color="error"
                    />
                  </Box>

                  <Typography variant="body2" mb={1}>
                    Outstanding: {currency(technicians.totalOutstanding)}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2">
                    Top Performers
                  </Typography>

                  {technicians.topPerformers.map((tech, i) => (
                    <Box key={i} mt={1}>
                      <Typography variant="body2">
                        {tech.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tech.completedOrders} completed
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </Grid>
      </Grid>

    </Box>
  );
}