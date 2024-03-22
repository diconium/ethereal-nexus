'use client';

import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from 'swagger-ui-react';
export function DashboardOpenApi() {
  return <SwaggerUI url="/dashboard/api_v1.json" />;
}
