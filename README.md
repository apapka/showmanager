**TO start the program**
First, must create the required database and install the packages:

`npm install`

`createdb horse-shows`
`psql -d horse-shows < schema.sql`
`psql -d horse-shows < lib/seed-data.sql`

Then `npm start` will run the program and you can redirect your browser to `localhost:3000`

You can elect to log in as admin with the following credentials

username: admin
password: password

Or you can create an account and have standard user capabilities as described below.


**Versions**

Version of node used: v16.14.2
Browser used: Google Chrome version 103.0.5060.53
Version of PostgreSQL used: 2.5.6

**Classes**
The classes page has two different display versions. One is for any user other than admin (signed in or not). This displays a paginated page with each class listed as a link to access its entries. The second version of the classes read page has a link to 'edit' for each class. This is only viewable when logged in as admin. 

Only the admin user can create, update, and delete classes. Admin can create classes through the "Manager Home" page, and update and delete classes via the buttons on the main classes page.

Any user can read classes without logging in. Classes are sorted numerically.


**Entries**
Any logged in user can create, update, and delete entries. Update and Delete are possible with the buttons next to each entry. (These are only visible when user is logged in.)

Any user can read all entries of any class. Entries are sorted numerically.

There are a couple of implementation decisions or trade-offs with this entries portion... in a real life situation users should only be able to modify or delete their own entries. There should also be further restrictions in terms of validating an entry, for example a horse should "exist in the system" and its number should always match its name, a horse and rider should always have the same name (preventing typos).

 These would require a more complicated database with a few more relations in the database (such as horse, rider, and trainer for example). It would also require a foreign key on entries which associates them with an account or user. 
 
 Some horse shows I've been to don't have add/scratch/modify functionality implemented at all for competitors/trainers to use, but instead accept a slip of paper to add/scratch and then a horse show office person adds it to the system. I'll plan to toy with this in a more complex app down the line.


