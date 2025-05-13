requireNamespace('tibble')
requireNamespace('dplyr')
requireNamespace('purrr')

columns <- function(df) df # Double-shim function; allows access to columns as properties from typescript.

choose <- function(df, choose_specification) {
    # The choose specification is a simple list of names.
    df[unlist(choose_specification)]
}

rename <- function(df, rename_specification) {
    # The rename specification is originally an object literal. In R it is a list.
    # The properties of the object are the new names and the values are the old names.
    spec_symbols <- lapply(rename_specification, function(old) expr(!!dplyr::sym(old))) # Only necessary to make .keep work.
    dplyr::mutate(!!!spec_symbols, .keep = 'unused')
}

augment <- function(df, col_name, f, argument_binding) {
    # argument_binding is just a named list whose names are the parameters of f and values are the columns of df to use.
    new_column <- lapply(argument_binding, function(colname) df[[colname]]) |> f()
    df[col_name] <- new_column
    df
}

fabricate_dataframe <- function(records) {
    # records argument is a list of lists, in an "array-of-structs" format.
    records |>
        purrr::map(~ tibble::tibble(
            !!!purrr::map(.x, ~ ifelse(is.list(.), list(.), .)) # Wrap list-type columns in another list to prevent flattening.
        )) |>
        purrr::list_rbind()
}
