"""
API Documentation Module
Deploys Swagger UI for interactive API documentation.
"""

# Default configuration constants
DEFAULT_SWAGGER_IMAGE = "swaggerapi/swagger-ui:latest"
DEFAULT_SPECS_PORT = 8088
DEFAULT_SOLVER_PORT = 3000

# API endpoints
API_ENDPOINTS = {
    "/quotes": "Get quotes for intent execution",
    "/orders": "Submit and manage orders",
    "/tokens": "Query supported tokens",
}

def launch(plan, args, solver_info):
    """
    Launch Swagger UI service for API documentation.
    
    Args:
        plan: Kurtosis plan object
        args: Configuration arguments
        solver_info: Information about the solver service
    
    Returns:
        Dictionary with service name and port information
    """
    # Extract configuration
    mode = args.get("mode", {}).get("specs", {})
    specs_config = args.get("specs", {})
    
    # Determine server URL for API
    server_url = _get_server_url(args, specs_config, solver_info)
    
    # Generate OpenAPI specification
    openapi_spec = _build_openapi_spec(server_url)
    
    # Create artifact for OpenAPI spec
    spec_artifact = plan.render_templates(
        config={
            "openapi.json": struct(
                template=openapi_spec,
                data={}
            )
        },
        name="openapi-spec"
    )
    
    # Prepare service configuration
    service_config = _prepare_service_config(plan, mode, specs_config, spec_artifact)
    
    # Launch service
    port = int(specs_config.get("port", DEFAULT_SPECS_PORT))
    service = plan.add_service(
        name="oif-specs",
        config=service_config
    )
    
    return {
        "service": "oif-specs",
        "port": port
    }

def _get_server_url(args, specs_config, solver_info):
    """
    Determine the API server URL.
    
    Args:
        args: Configuration arguments
        specs_config: Specs-specific configuration
        solver_info: Solver service information
    
    Returns:
        String containing the server URL
    """
    # Check for explicitly configured servers
    servers = specs_config.get("servers", [])
    if servers:
        return servers[0]
    
    # Build default server URL from solver configuration
    solver_port = int(args.get("solver", {}).get("api", {}).get("port", DEFAULT_SOLVER_PORT))
    return "http://localhost:%d/api" % solver_port

def _build_openapi_spec(server_url):
    """
    Build the OpenAPI specification JSON.
    
    Args:
        server_url: Base URL for the API server
    
    Returns:
        String containing the OpenAPI JSON specification
    """
    # Build paths object with documented endpoints
    paths = _build_api_paths()
    
    # Construct the complete OpenAPI specification
    spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "OIF Solver API",
            "version": "0.0.1",
            "description": "Open Intents Framework Solver REST API"
        },
        "servers": [
            {
                "url": server_url,
                "description": "Solver API Server"
            }
        ],
        "paths": paths
    }
    
    # Convert to JSON string (manual formatting for Starlark)
    return _json_stringify(spec)

def _build_api_paths():
    """
    Build the paths object for OpenAPI specification.
    
    Returns:
        Dictionary representing API paths
    """
    paths = {}
    
    # Add each endpoint with basic documentation
    for endpoint, description in API_ENDPOINTS.items():
        paths[endpoint] = {
            "description": description
        }
    
    return paths

def _json_stringify(obj):
    """
    Convert a dictionary to JSON string (Starlark-compatible).
    
    Args:
        obj: Dictionary to convert
    
    Returns:
        JSON string representation
    """
    # Manual JSON construction for Starlark compatibility
    json_parts = ['{']
    
    # Add OpenAPI version
    json_parts.append('"openapi":"3.0.0",')
    
    # Add info object
    json_parts.append('"info":{')
    json_parts.append('"title":"OIF Solver API",')
    json_parts.append('"version":"0.0.1",')
    json_parts.append('"description":"Open Intents Framework Solver REST API"')
    json_parts.append('},')
    
    # Add servers
    server_url = obj["servers"][0]["url"]
    json_parts.append('"servers":[{"url":"%s","description":"Solver API Server"}],' % server_url)
    
    # Add paths
    json_parts.append('"paths":{')
    path_items = []
    for endpoint in API_ENDPOINTS.keys():
        path_items.append('"%s":{}' % endpoint)
    json_parts.append(','.join(path_items))
    json_parts.append('}')
    
    json_parts.append('}')
    
    return ''.join(json_parts)

def _prepare_service_config(plan, mode, specs_config, spec_artifact):
    """
    Prepare the service configuration for Swagger UI.
    
    Args:
        plan: Kurtosis plan object
        mode: Mode configuration
        specs_config: Specs-specific configuration
        spec_artifact: OpenAPI specification artifact
    
    Returns:
        ServiceConfig object for the Swagger UI service
    """
    image = mode.get("image", DEFAULT_SWAGGER_IMAGE)
    port = int(specs_config.get("port", DEFAULT_SPECS_PORT))
    
    # Prepare files for Swagger UI - using artifact
    files = {
        "/usr/share/nginx/html": spec_artifact,
    }
    
    # Environment variables for Swagger UI
    env_vars = {
        "SWAGGER_JSON": "/openapi.json",
    }
    
    return ServiceConfig(
        image=image,
        files=files,
        env_vars=env_vars,
        ports={
            "http": PortSpec(
                number=port,
                transport_protocol="TCP"
            )
        },
    )