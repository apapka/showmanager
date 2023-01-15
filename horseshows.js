const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const store = require("connect-loki");
const catchError = require("./lib/catch-error");
const PgPersistence = require("./lib/pg-persistence");
const { eq } = require("lodash");

const app = express();
const host = "localhost";
const port = 3000;
const LokiStore = store(session);

app.set("views", "./views");
app.set("view engine", "pug");
app.use(morgan("common"));
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/",
    secure: false,
  },
  name: "launch-school-todos-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));

app.use(flash());

// Extract session info
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  res.locals.signedIn = req.session.signedIn;
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Detect unauthorized access to routes.
const requiresAuthentication = (req, res, next) => {
  if (!res.locals.signedIn) {
    req.flash("error", "You do not have access to this page.")
    req.session.redirectTo = req.originalUrl;
    res.redirect(302, "/signin");
  } else {
    next();
  }
};
const requiresAdminAuthentication = (req, res, next) => {
  if (!res.locals.signedIn || res.locals.username !== 'admin') {
    req.flash("error", "You do not have access to this page.");
    req.session.redirectTo = req.originalUrl;
    res.redirect(302, "/signin");
  } else {
    next();
  }
}


app.use((req,res,next) =>{
  res.locals.store = new PgPersistence(req.session);
  next();
})

app.get("/", (req, res, next) => {
  res.render("home");
})
app.get("/signin", (req, res, next) => {
  res.render("signin");
} )

app.get("/createaccount", (req, res, next) => {
  res.render("createaccount")
}
)

app.get("/add-class", 
  requiresAdminAuthentication,
  catchError(async (req, res) => {
    res.render("add-class");
  })

)
app.get("/modify-class", 
  requiresAdminAuthentication,
  catchError(async (req, res) => {
    let classes = await res.locals.store.sortedClasses();
    if (!classes) throw new Error("Classes not found"); 
    res.render("modify-class", {
      classes,
    });
  })
)

app.get("/scratch", 
  catchError(async (req, res) => {
    let store = res.locals.store;
    res.render("scratch", {

    })
  })
)
app.get("/classes", 
  catchError(async (req, res) => {
    // console.log(`FLASH ERRORS: ${req.flash("error")}`);
    if(res.locals.flash){
       req.flash("error", res.locals.flash.error);
    }

    let store = res.locals.store;
    let pageNumber = req.query.page ;
    if (isNaN(pageNumber)) pageNumber = 0;
    if (pageNumber < 0) throw new Error("Cannot have negative page number");

    let offset = pageNumber * 5;
    let numberClasses = await store.countClasses();
    if (offset >= numberClasses) {
      req.flash("error", `Page number ${Number(pageNumber)} does not exist`)
    }
    let classes = await store.sortedClasses(offset);
    if(!classes) throw new Error("Classes not found");
    res.render("classes", {
      classes,
      pageNumber,
      flash: req.flash(),
    })
  })
)

app.get("/classes/:classId", 
  catchError(async (req, res) => {
    let store = res.locals.store;
    let classId = req.params.classId;
    let numberClassString = Number(classId);
    let pageNumber = req.query.page;
    if (isNaN(numberClassString)) {
      req.flash("error", "Invalid class number");
      res.redirect("/classes");
    }
    if (isNaN(pageNumber)) pageNumber = 0;
    if (pageNumber < 0) throw new Error("Cannot have negative page number");
    let offset = pageNumber * 5;
    let numberEntries = await store.countEntries(classId);
    if (offset >= numberEntries) {
      req.flash("error", `Page number ${classId} does not exist`);
      res.redirect("/classes");
    }
    let className = await store.getClassName(classId);
    if(!className) throw new Error("Class name not found");
    let entries = await store.loadEntries(classId, offset);
    if(!entries) throw new Error("Entries not found");
    res.render("entries", {
      classId,
      className: className.name,
      pageNumber,
      entries,
    })
  })
);

app.get("/manager-home", 
  catchError(async (req, res) => {
    res.render("managerhome");
  }))
app.get("/classes/:classId/edit",
  requiresAdminAuthentication,
  catchError(async (req, res) => {
    if(res.locals.flash) {
      req.flash("error", res.locals.flash.error);
    }
    let classId = req.params.classId;
    let klass = await res.locals.store.loadClass(classId);
    if(!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes")
    } else{
      res.render("modify-class", {
        klass
    })
    }

  }) )
app.get("/classes/:classId/destroy", 
  requiresAdminAuthentication,
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let klass = await res.locals.store.loadClass(classId);
    if(!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes")
    } else {
      res.render("delete-class",{
        klass,
      });
    }

  })
)
app.get("/classes/:classId/entries/add", 
  requiresAuthentication,
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let store = res.locals.store;
    let klass = await store.loadClass(classId);
    if (!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes");
    } else{
      res.render("add", {
        klass,
        
      });
    }
  })

)
app.get("/classes/:classId/entries/:entryId/destroy",
  requiresAuthentication,
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let entryId = req.params.entryId;
    let store = res.locals.store;
    let klass = await store.loadClass(classId);
    if (!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes");
    } else {
      let entry = await store.loadEntry(entryId);
      if (!entry) {
        req.flash("error", `Entry ${entryId} of does not exist`);
        res.redirect(`/classes/${classId}`);
      } else {
        res.render("scratch", {
          klass,
          entry,
        })
      }
    }
  })
)
app.get("/classes/:classId/entries/:entryId/edit", 
  requiresAuthentication,
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let entryId = req.params.entryId;
    let store = res.locals.store;
    let klass = await store.loadClass(classId);
    if (!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes");
    } else {
      let entry = await store.loadEntry(entryId);
      if (!entry) {
        req.flash("error", `Entry ${entryId} of does not exist`);
        res.redirect(`/classes/${classId}`);
      } else {
        res.render("modify-entry", {
          klass, 
          entry,
        })
      }

    }

  })
)
app.get("/add-scratch", 
  requiresAuthentication,
  catchError(async (req, res) => {
    res.render("add-or-scratch");
  })

)
app.get("/add", 
  requiresAuthentication,
  catchError(async (req, res) => {
    let store = res.locals.store;
    // let riders = await store.loadRiders();
    // let classes = await store.loadCompetition();
    res.render("add", {
      // riders,
    });
  })
)

app.post("/signin", 
  catchError(async (req, res) => {
    let redirectTo = req.session.redirectTo || "/";
    delete req.session.redirectTo;
    let username = req.body.username;
    let password = req.body.password;
    let logIn = await res.locals.store.authenticate(username, password);
    console.log(logIn);
    if (!logIn) {
      req.flash("error", "Did not recognize username or password"); 
      res.render("signin", {
        flash: req.flash(),
      })
    } 
    let session = req.session;
    session.username = username;
    session.signedIn = true;
    res.redirect(redirectTo);
    // if(username !== 'admin'){
    //   res.redirect("/classes");
    // } else {
    //   res.redirect("/manager-home");
    // }
  })
)
app.post("/signout", (req, res) => {
  delete req.session.username;
  delete req.session.signedIn;
  res.redirect("/signin");
})
app.post("/createaccount", 
  [body("username")
    .trim()
    .isLength({ min: 1}) 
    .withMessage("Email is required.")
    .isLength({ max: 100 })
    .withMessage("Email exceeds length requirement")
    .isEmail().withMessage("Must be an email"),
  body("password1")
    .trim()
    .isLength({ min: 1})
    .withMessage("Password is required.")
    .custom((password, {req, loc, path}) => {
      if (password !== req.body.password2) {
        throw new Error("Passwords don't match");
      } else {
        return password;
      }
    })
  ], 
  catchError(async (req, res) => {
    let email = req.body.username;
    let password = req.body.password1;
    console.log(`FIRST PASSWORD : ${password}`)
    let errors = validationResult(req);
      console.log(errors);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("createaccount", {
        flash: req.flash(),
      } 
      );
    } else if (await res.locals.store.existsEmailAddress(email)) {
      req.flash("error", "This email already has an account");
      res.render("signin", {
        flash: req.flash(),
      })
    } else {
      let result = await res.locals.store.createAccount(email, password);
      if (!result) throw new Error("Could not create account.");
      req.flash("success", "Account successfully created. Please log in");
      res.redirect("/signin");
    }

  })

)
app.post(`/classes/:classId/entries/add`, 
  requiresAuthentication,
  [
    body("horse_number")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The horse number is required.")
      .isLength({ max: 3 })
      .withMessage("Horse number must be between 1 and 999.")
      .isInt()
      .withMessage("Prize money be integer amount"),

    body("horse_name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The horse name is required.")
      .isLength({max: 20})
      .withMessage("Horse name must be between 1 and 20 characters long"),
    body("rider_name")
      .trim()
      .isLength( { min: 1 })
      .withMessage("The rider name is required.")
      .isLength( { max: 30 })
      .withMessage("Rider name must be between 1 and 30 characters"),
     
  ],
  catchError(async (req, res) => {
    let horse_number = req.body.horse_number;
    let horse_name = req.body.horse_name;
    let rider_name = req.body.rider_name;
    let classId = req.params.classId;
    let errors = validationResult(req);
    let klass = await res.locals.store.loadClass(classId);
    if (!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes");
    } else {
      const rerenderAddScratch = () => {
        res.render("add", {
          flash: req.flash(),
          klass
        })
      }
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        rerenderAddScratch();
      } else {
        let created = await res.locals.store.createEntry(classId, horse_number, horse_name, rider_name);
        if(!created) throw new Error("Unable to create entry");
        req.flash("success", "The entry has been created");

        res.redirect(`/classes/${classId}`)

      }
  }
  })
)
app.post("/classes/:classId/entries/:entryId/destroy",
  requiresAuthentication,
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let entryId = req.params.entryId;
    let store = res.locals.store;
    let deleted = await store.deleteEntry(entryId);
    if (!deleted) throw new Error("Class not found")
    req.flash("success", "The entry has been scratched");
    res.redirect(`/classes/${classId}`)
  })
)

app.post("/classes/:classId/entries/:entryId/edit",
  requiresAuthentication,
  [
    body("horse_name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The horse name is required.")
      .isLength({ max: 20 })
      .withMessage("Horse name must be between 1 and 20 characters."),
    body("rider_name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The rider name is required.")
      .isLength({max: 30})
      .withMessage("Rider name must be between 1 and 30 characters long"),
  ],
  catchError(async (req, res) => {
    let classId = req.params.classId;
    let entryId = req.params.entryId;
    let horse_name = req.body.horse_name;
    let rider_name = req.body.rider_name;
    let store = res.locals.store;
    let klass = await store.loadClass(classId);
    if (!klass) {
      req.flash("error", `Class ${classId} does not exist`);
      res.redirect("/classes");
    } else {
      let entry = await store.loadEntry(entryId);
      if (!entry) throw new Error("Could not find entry.");
      const rerenderModifyEntry = () => {
        res.render("modify-entry", {
          flash: req.flash(),
          klass,
          entry
        })

      }    
    
      try {
      let errors = validationResult(req);
      if (!errors.isEmpty()) {
        errors.array().forEach(message => req.flash("error", message.msg));
        rerenderModifyEntry();
      } else {
        let edited = await store.editEntry(entryId, horse_name, rider_name);
        if (!edited) throw new Error("Unable to edit entry");
        req.flash("success", "The entry has been modified");
        res.redirect(`/classes/${classId}`)
      }
    } catch(error){
      throw error;
    }
  }
  })

)



app.post("/add-class", 
  requiresAdminAuthentication,
  [
    body("class_name")
      .trim()
      .isLength( { min: 1 })
      .withMessage("The class name is required")
      .isLength( { max: 35 })
      .withMessage("Class name exceeds length allowed"),
    body("prize_money")
      .trim()
      .isLength( { min: 1} )
      .withMessage("The prize money is required")      
      .isInt()
      .withMessage("Prize money be integer amount")

  ],
  catchError(async (req, res) => {
    let className = req.body.class_name;
    let prizeMoney = req.body.prize_money;
    let ring = req.body.ring;
    let errors = validationResult(req);
    const rerenderAddClass = () => {
      res.render("add-class", {
        flash: req.flash(),
      })
    }
    if (!errors.isEmpty()){
      errors.array().forEach(message => req.flash("error", message.msg));
      rerenderAddClass();
    }else {
      let added = await res.locals.store.addClass(className, prizeMoney);
      if (!added) throw new Error("Unable to create class");
      req.flash("success", "The class has been added");
      res.redirect("/classes")
    }
  })
)


app.post("/classes/:classId/edit", 
  requiresAdminAuthentication,
  [
    body("class_name")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Class name is required")
      .isLength({ max: 35 })
      .withMessage("Class name exceeds allowed length"),
    body("prize_money")
      .trim()
      .isLength( { min: 1 })
      .withMessage("Prize money is required")
      .isInt()
      .withMessage("Prize money must be integer format. With no dollar sign"),
  ], 
  catchError(async (req, res) => {
    let oldClassId = req.params.classId;
    let newClassName = req.body.class_name;
    let prizeMoney = req.body.prize_money;
    let klass = await res.locals.store.loadClass(oldClassId);
    if (!klass) throw new Error("Class not found");
    let classes = await res.locals.store.sortedClasses();
    if(!classes) throw new Error("Classes not found");

    const rerenderModifyClass = () => {
      res.render("modify-class", {
        flash: req.flash(),
        klass,

      })
    };
    try{
      let errors = validationResult(req);
      if (!errors.isEmpty()){
        errors.array().forEach(message => req.flash("error", message.msg));
        rerenderModifyClass();
      }else {
        let updated = await res.locals.store.updateClass(oldClassId, newClassName, prizeMoney);
        if (!updated) throw new Error("Unable to update class");
        req.flash("success", "The class has been updated");
        res.redirect("/classes")
      }
    }catch(error){
      throw error;
    }
  })
)

app.post(`/classes/:classId/destroy`, 
requiresAdminAuthentication,
catchError(async (req, res) => {
  let classId = req.params.classId;
  let destroyed = await res.locals.store.deleteClass(classId);
  if (!destroyed) throw new Error("Couldn't destroy class");
  req.flash("success", "The class has been deleted");
  res.redirect("/classes");
})
)


// Error handler
app.use((err, req, res, _next) => {
  console.log(err); // Writes more extensive information to the console log
  res.status(404).send(err.message);
});

// Listener
app.listen(port, host, () => {
  console.log(`Horseshows is listening on port ${port} of ${host}!`);
});
