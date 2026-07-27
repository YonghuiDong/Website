# REMEMBER to restart R after you modify and save this file!

# First, execute the global .Rprofile if it exists. You may configure blogdown
# options there, too, so they apply to any blogdown projects. Feel free to
# ignore this part if it sounds too complicated to you.
if (file.exists("~/.Rprofile")) {
  base::sys.source("~/.Rprofile", envir = environment())
}

# Now set options to customize the behavior of blogdown for this project. Below
# are a few sample options; for more options, see
# https://bookdown.org/yihui/blogdown/global-options.html
options(
  # to automatically serve the site on RStudio startup, set this option to TRUE
  blogdown.serve_site.startup = FALSE,
  # to disable knitting Rmd files on save, set this option to FALSE
  blogdown.knit.on_save = TRUE,
  # build .Rmd to .html (via Pandoc); to build to Markdown, set this option to 'markdown'
  blogdown.method = 'html'
)

# fix Hugo version
options(blogdown.hugo.version = "0.89.4")

resolve_travel_map_cities <- function() {
  node <- Sys.which("node")
  if (!nzchar(node)) {
    warning("Node.js was not found; travel city coordinates were not resolved.")
    return(invisible())
  }

  status <- system2(node, "scripts/resolve-travel-cities.mjs")
  if (!identical(status, 0L)) {
    stop("Travel city coordinate lookup failed. Check the city and country spelling.")
  }

  system2(
    node,
    "scripts/watch-travel-cities.mjs",
    env = "TRAVEL_WATCH_SKIP_INITIAL=1",
    wait = FALSE,
    stdout = FALSE,
    stderr = FALSE
  )
}

options(blogdown.server.first = resolve_travel_map_cities)
