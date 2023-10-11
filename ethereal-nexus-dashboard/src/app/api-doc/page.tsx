import "swagger-ui-react/swagger-ui.css";
import { getSwaggerSpec } from "@/lib/api-doc/api-doc.service";
import ReactSwagger from "@/app/api-doc/react-swagger";

export default async function ApiDoc() {
  const spec = await getSwaggerSpec();
  return (
    <div className="container h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <ReactSwagger spec={spec} />
    </div>
  );
}
