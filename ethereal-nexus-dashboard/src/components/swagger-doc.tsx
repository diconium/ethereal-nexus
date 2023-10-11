'use client'

import 'swagger-ui-react/swagger-ui.css';
import SwaggerUI from "swagger-ui-react";


export default function SwaggerDoc({spec}: any) {
    return (
        <SwaggerUI spec={spec} />
    );
}