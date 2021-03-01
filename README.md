# Node + Sockets + Database + Radiant Interface

## Node

I use Node and NPM to define packages.json, which should have everything you need in it. If anything's missing let me know!

## Sockets

###Custom secure websockets.
A box appears in the top-right corner of the site (configurable) which shows the current socket status.
Sockets automatically reconnect if disconnected. 
We expose two keys to the frontend: one per computer and one per session.
On the backend they're associated with a single userid.

Interfacing with the sockets is easy. From the frontend:

    socketRegister( event, callback ) // Register a socket event
    openSocket( url, callback ) // Connect the socket
    sendSocket( obj ) // Send an object to the server

And from the backend, we support automation as well as direct communication. Automation in the database means
that it will automatically check permissions and respond with the right data objects, properly mapping and/or masking
the data in any way you could possibly want.


## Database

Here we have a disk-backed data storage unit which has an interface somewhat like Mongoose. You define your
databases and tables as objects, then call db.convey() and db.control() to take ownership of those objects, which are
then used to decide when to load and save data, when to archive data, when to replicate it, and when it is no longer
needed. Archival and replication are not set up yet, and the indexing is fairly basic.

However, it is useful, providing such features as retaining data between sessions or dropping it, depending on
configuration, and also pre-save/post-load automation for things like removing cleartext passwords or encrypting
them on i/o. For more information, please see included examples in lib/base.

## Architecture

I have used a common node.js skeleton syntax for my files, but I am no longer relying on Express. The layout looks something like this:

lib/control - Handle URLs and routing requests. Closest to the user.
lib/data - Manipulate data in the background. 2nd tier, can run in the background using 'workcycle()'.
lib/base - The database object definitions and any special methods they might need.
lib/singlets - Single files with URL routing, data manipulation, and tables in one file. For brief things. I usually prototype most interfaces here, then migrate to the folders above.
lib/tool - general purpose implementation details that I don't want to look at very often
lib/eccentric - various integrations such as Stripe, email, events, http, object handling/string library support, ... some of it should probably be in 'tool'

In lib/ you will find app.js, test.js, config.js, and local-config.js. These are what they're named; test is the testing system, app is the primary application controller, and config is your setup.
Passwords etc can be stored more securely and controlled separately on pooled servers in local-config.js; otherwise the files are identical in purpose.


## 


## Examples

Just snoop around, it's pretty easy reading.


## Next Steps

I plan to continue development of the system as I work on an interface to a 3d game I've written. It will stay webappish and become more complex and easier to prototype new things with.
I also have a lot of various information systems that I need to write in order to assist my development as a Schizophrenic, so those are in the plan too, and Radiant will get more and more
utilities and tools, support for graphing etc as that happens.

When I have built enough examples to survive my own insane membrain, I will fork Radiant away from them and stop updating it as much, focusing more on the game engine. 

In other words, Radiant will get more functionality, more support, clean itself up, and then die.









