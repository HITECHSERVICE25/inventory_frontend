import React from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";

const data = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 500 },
  { name: "Apr", value: 700 },
  { name: "May", value: 600 },
];

export default function Dashboard() {
  return (
    <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Monthly Sales
          </Typography>
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "200px", borderBottom: "2px solid #3f51b5", paddingBottom: "10px" }}>
            {data.map((item, index) => (
              <div key={index} style={{ width: "40px", height: `${item.value / 5}px`, backgroundColor: "#3f51b5", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                {item.value}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Actions
          </Typography>
          <Button variant="contained" color="primary" style={{ marginRight: "8px" }}>
            Refresh
          </Button>
          <Button variant="outlined" color="primary">
            Export
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
