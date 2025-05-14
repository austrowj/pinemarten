requireNamespace('tibble')
requireNamespace('dplyr')
requireNamespace('purrr')
requireNamespace('rlang')

columns <- function(df) df # Double-shim function; allows access to columns as properties from typescript.

choose <- function(df, choose_specification) {
    # The choose specification is a simple list of names.
    df[unlist(choose_specification)]
}

rename <- function(df, rename_specification) {
    # The rename specification is originally an object literal. In R it is a list.
    # The properties of the object are the new names and the values are the old names.
    old_names <- unname(rename_specification)
    new_names <- names(rename_specification)
    df <- dplyr::rename(df, !!!rlang::set_names(old_names, new_names))
    return(df)
}

augment <- function(df, col_name, f, argument_binding) {
    # argument_binding is just a named list whose names are the parameters of f and values are the columns of df to use.
    new_column <- lapply(argument_binding, function(colname) df[[colname]]) |> f()
    df[col_name] <- new_column
    df
}

graft <- function(df, fn, argument_binding) {
    new_columns <- lapply(argument_binding, function(colname) df[[colname]]) |> fn()
    dplyr::bind_cols(df, new_columns)
}

leftjoin <- function(left, right, column_names) {
    dplyr::left_join(left, right, unlist(column_names)) # column_names come in as a list and the contents have already been verified.
}

narrow <- function(df, col_name, val) {
    df[df[[col_name]] == val, ] # The comma is very important :)
}

fabricate_dataframe <- function(records) {
    # records argument is a list of lists, in an "array-of-structs" format.
    records |>
        purrr::map(~ tibble::tibble(
            !!!purrr::map(.x, ~ ifelse(is.list(.), list(.), .)) # Wrap list-type columns in another list to prevent flattening.
        )) |>
        purrr::list_rbind()
}
