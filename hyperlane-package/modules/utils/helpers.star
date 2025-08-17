# Utility Helpers Module - Shared utility functions used across modules

# ============================================================================
# SAFE ACCESS UTILITIES
# ============================================================================

def safe_get(arg_map, key, default=""):
    """
    Safely get a value from a map with a default
    
    Args:
        arg_map: Map to get value from
        key: Key to look up
        default: Default value if key not found
        
    Returns:
        Value from map or default
    """
    # Check if it's a dict
    if type(arg_map) == "dict":
        return arg_map[key] if key in arg_map else default
    # Otherwise assume it's a struct and use getattr
    return getattr(arg_map, key, default)

# ============================================================================
# TYPE CONVERSION UTILITIES
# ============================================================================

def as_bool(v, default=False):
    """
    Convert a value to boolean
    
    Args:
        v: Value to convert
        default: Default if conversion fails
        
    Returns:
        Boolean value
    """
    if type(v) == "bool":
        return v
    if type(v) == "string":
        lv = v.lower()
        if lv in ["true", "1", "yes"]:
            return True
        if lv in ["false", "0", "no"]:
            return False
    return default

def as_int(v, default=0):
    """
    Convert a value to integer
    
    Args:
        v: Value to convert
        default: Default if conversion fails
        
    Returns:
        Integer value
    """
    if type(v) == "int":
        return v
    # Note: Starlark doesn't support try/except
    # Removed try/except block as it's not valid in Starlark
    return default

# ============================================================================
# STRING UTILITIES
# ============================================================================

def join_strings(arr, sep):
    """
    Join array elements with a separator
    
    Args:
        arr: Array of strings
        sep: Separator string
        
    Returns:
        Joined string
    """
    out = ""
    for i, x in enumerate(arr):
        if i > 0:
            out += sep
        out += str(x)
    return out

def format_key_value_pairs(pairs, sep="=", delimiter=","):
    """
    Format key-value pairs into a string
    
    Args:
        pairs: Dictionary of key-value pairs
        sep: Separator between key and value
        delimiter: Delimiter between pairs
        
    Returns:
        Formatted string
    """
    result = []
    for key, value in pairs.items():
        result.append("{}{}{}".format(key, sep, value))
    return join_strings(result, delimiter)

# ============================================================================
# COLLECTION UTILITIES
# ============================================================================

def extract_names(items, key="name"):
    """
    Extract a specific field from a list of objects
    
    Args:
        items: List of objects
        key: Field to extract
        
    Returns:
        List of extracted values
    """
    result = []
    for item in items:
        if key in item:
            result.append(item[key])
    return result

def filter_items(items, predicate):
    """
    Filter items based on a predicate function
    
    Args:
        items: List of items
        predicate: Function that returns True for items to keep
        
    Returns:
        Filtered list
    """
    result = []
    for item in items:
        if predicate(item):
            result.append(item)
    return result

def find_item(items, key, value):
    """
    Find first item in list where item[key] == value
    
    Args:
        items: List of items
        key: Key to check
        value: Value to match
        
    Returns:
        Found item or None
    """
    for item in items:
        if safe_get(item, key) == value:
            return item
    return None

# ============================================================================
# VALIDATION UTILITIES
# ============================================================================

def is_empty(value):
    """
    Check if a value is empty
    
    Args:
        value: Value to check
        
    Returns:
        True if empty, False otherwise
    """
    if value == None:
        return True
    if type(value) == "string" and value == "":
        return True
    if type(value) == "list" and len(value) == 0:
        return True
    if type(value) == "dict" and len(value) == 0:
        return True
    return False

def require_not_empty(value, error_msg):
    """
    Require that a value is not empty
    
    Args:
        value: Value to check
        error_msg: Error message if empty
    """
    if is_empty(value):
        fail(error_msg)

# ============================================================================
# DIRECTORY UTILITIES
# ============================================================================

def create_persistent_directory(key):
    """
    Create a persistent directory with the given key
    
    Args:
        key: Persistent key for the directory
        
    Returns:
        Directory artifact
    """
    return Directory(persistent_key=key)

# ============================================================================
# MERGE UTILITIES
# ============================================================================

def merge_dicts(base, override):
    """
    Merge two dictionaries, with override taking precedence
    
    Args:
        base: Base dictionary
        override: Override dictionary
        
    Returns:
        Merged dictionary
    """
    result = {}
    
    # Add all base values
    for key, value in base.items():
        result[key] = value
    
    # Override with new values
    for key, value in override.items():
        result[key] = value
    
    return result

# ============================================================================
# LOGGING UTILITIES
# ============================================================================

def log_info(message):
    """
    Log an info message
    
    Args:
        message: Message to log
    """
    # Note: In Kurtosis, we can't use print() directly
    # The caller should use plan.print() instead
    # For now, we'll just return the formatted message
    return "[INFO] {}".format(message)

def log_warning(message):
    """
    Log a warning message
    
    Args:
        message: Message to log
    """
    # Note: In Kurtosis, we can't use print() directly
    return "[WARNING] {}".format(message)

def log_debug(message, debug=False):
    """
    Log a debug message if debug is enabled
    
    Args:
        message: Message to log
        debug: Whether debug logging is enabled
    """
    if debug:
        return "[DEBUG] {}".format(message)
    return ""