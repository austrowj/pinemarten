requireNamespace('tibble')

dataframe <- tibble::tibble

# TODO: remove, we have to handle this at the compiler level.
as <- function(df, transform) {
    # Apply the given transformation to the dataframe and return result.
    # df: the starting dataframe.
    # transform: a function that returns a new dataframe.
    transform(df)
}
