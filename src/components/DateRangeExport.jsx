import React, { useState } from "react";
import { Paper, Box, Typography, TextField, Button } from "@mui/material";


const DateRangeExport= ({
  title,
  filePrefix,
  exportApi
}) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const isDateRangeValid = () => {
    if (!startDate || !endDate) return false;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffInDays =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return diffInDays >= 0 && diffInDays <= 90;
  };

  const handleExport = async () => {
    if (!isDateRangeValid()) {
      alert("Date range must be within 90 days and valid.");
      return;
    }

    try {
      setExportLoading(true);

      const res = await exportApi({
        startDate,
        endDate
      });

      const blob = new Blob([res.data], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      link.setAttribute(
        "download",
        `${filePrefix}_${startDate}_to_${endDate}.xlsx`
      );

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap"
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>

        <TextField
          type="date"
          label="Start Date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <TextField
          type="date"
          label="End Date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          error={startDate && endDate && !isDateRangeValid()}
          helperText={
            startDate && endDate && !isDateRangeValid()
              ? "Maximum range is 90 days"
              : ""
          }
        />
      </Box>

      <Button
        variant="contained"
        size="medium"
        onClick={handleExport}
        disabled={!isDateRangeValid() || exportLoading}
        sx={{ minWidth: 140, fontWeight: 600 }}
      >
        {exportLoading ? "Exporting..." : "Export Excel"}
      </Button>
    </Paper>
  );
};

export default DateRangeExport;