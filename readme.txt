If you want to build the website locally you will need to open to command line in the root folder.
In the first one run that command:
 * npm run serve
It'll launch a local server that you need prior to building the website as it is used to generate critical CSS.
Then in a second command line run:
 * npm run build
or
 * npm run buildev
They both generate the same webiste. builddev is quicker but bigger (specially images) and CSS/Javascript/html is not mignify (easier for debug).