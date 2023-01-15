const { Session } = require("express-session");
const { findLastKey, result, reject, toInteger } = require("lodash");
const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");
const { resolve } = require("upath");

async function hashPassword(password) {
  console.log(`PASSWORD IS : ${password} type of it IS: ${typeof password}`)
  const hashedPassword = await new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, function(err, hash) {
      if (err) reject(err)
      resolve(hash)
    });
  })
  return hashedPassword;
}

module.exports = class PgPersistence {
  constructor(session) {
    this.username = session.username;
  }
  async createAccount(username, password) {
    const CREATE_ACCOUNT = "INSERT INTO accounts (email, password) VALUES ($1, $2)";
    console.log(`IN CREATE ACCOUNT USERNAME: ${username} PASSWORD: ${password}`)
    let hashed_pw = await hashPassword(password);
    let created = await dbQuery(CREATE_ACCOUNT, username, hashed_pw);
    if (!created) return undefined;
    return created.rowCount > 0;
  }
  async authenticate(username, password) {
    console.log(`in authenticate... USERNAME: ${username} PASSWORD: ${password}`)
    const FIND_HASHED_PASSWORD = "SELECT password FROM accounts" + 
                                 "  WHERE email = $1";

    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if(result.rowCount ===0) {
      console.log("FALSE!")
      return false;
    }
    return bcrypt.compare(password, result.rows[0].password);
    
  }
  async getClassName(classId) {
    const FIND_CLASS_NAME = "SELECT name FROM classes WHERE id = $1"
    let result = await dbQuery(FIND_CLASS_NAME, classId);
    return result.rows[0];
  }
  async existsEmailAddress(email) {
    const FIND_EMAIL = "SELECT * FROM accounts WHERE email = $1";
    let result = await dbQuery(FIND_EMAIL, email);
    console.log(`${result}`)
    return result.rowCount > 0;
  }
  async existsHorseNum(horseNum) {
    const FIND_HORSENUM = "SELECT * FROM horses WHERE id = $1";
    let result = await dbQuery(FIND_HORSENUM);
    return result.rowCount > 0;
  }
  async existsClassNum(classNum) {
    const FIND_CLASS = "SELECT * FROM classes WHERE number = $1";
    let result = await dbQuery(FIND_CLASS, classNum);
    return result.rowCount > 0;
  }
  async deleteClass(classId) {
    const DELETE_CLASS = "DELETE FROM classes WHERE id = $1";
    let result = await dbQuery(DELETE_CLASS, classId);
    return result.rowCount > 0;
  }
  async loadClass(classId) {
    const FIND_CLASS = "SELECT * FROM classes WHERE id = $1";
    let result = await dbQuery(FIND_CLASS, classId);
    if (!result) return undefined;
    let klass = result.rows[0];
    return klass;
  }
  async loadEntry(entryId) {
    const FIND_ENTRY = "SELECT * FROM entries WHERE id = $1";
    let result = await dbQuery(FIND_ENTRY, entryId);
    if (!result) return undefined;
    let entry = result.rows[0];
    return entry;
  }
  async addClass(className, prizeMoney) {
    const ADD_CLASS = "INSERT INTO classes (name, prize_money) VALUES ($1, $2)";
    let result = await dbQuery(ADD_CLASS, className, prizeMoney);
    return result.rowCount > 0;
  }
  async createEntry(classId, horse_number, horse_name, rider_name) {
    const ADD_ENTRY = "INSERT INTO entries (horse_id, horse_name, rider_name, class_id) " + 
                        " VALUES ($1,$2,$3,$4) ";
    let result = await dbQuery(ADD_ENTRY, horse_number, horse_name, rider_name, classId );
    return result.rowCount > 0;                   
  }
  async deleteEntry(entryId) {
    const DELETE_ENTRY = "DELETE FROM entries WHERE id = $1";
    let result = await dbQuery(DELETE_ENTRY, entryId);
    return result.rowCount > 0;
  }
  async editEntry(entryId, horseName, riderName) {
    const EDIT_HORSE_NAME= "UPDATE entries SET horse_name = $1 WHERE id = $2";
    const EDIT_RIDER_NAME = "UPDATE entries SET rider_name = $1 WHERE id = $2";
    let resultHorseName =  dbQuery(EDIT_HORSE_NAME, horseName, entryId);
    let resultRiderName = dbQuery(EDIT_RIDER_NAME, riderName, entryId);
    let resultBoth = await Promise.all([resultHorseName, resultRiderName]);
    return resultBoth[0].rowCount > 0 && resultBoth[1].rowCount > 0;

  }
  async updateClass(oldClassId, newClassName, prizeMoney){
    const UPDATE_NAME = "UPDATE classes SET name = $1 WHERE id = $2";
    const UPDATE_PRIZE_MONEY = "UPDATE classes SET prize_money = $1 WHERE id= $2 "
    let resultName =  dbQuery(UPDATE_NAME, newClassName, oldClassId);
    let resultPrizeMoney = dbQuery(UPDATE_PRIZE_MONEY, prizeMoney, oldClassId);
    let resultBoth = await Promise.all([resultName, resultPrizeMoney]);
    return resultBoth[0].rowCount > 0 && resultBoth[1].rowCount > 0;

  }
  async loadEntries(classId, offset) {
    const FIND_ENTRIES = "SELECT * FROM entries WHERE entries.class_id = $1 ORDER BY horse_id LIMIT 5 OFFSET $2 ";
    let result = await dbQuery(FIND_ENTRIES, classId, offset);
    return result.rows;             
  }
  async countClasses() {
    const ALL_CLASSES = "SELECT * FROM classes";
    let result = await dbQuery(ALL_CLASSES);
    return result.rowCount;
  }
  async countEntries(classId) {
    const ALL_ENTRIES = "SELECT * FROM entries WHERE class_id = $1";
    let result = await dbQuery(ALL_ENTRIES, classId);
    return result.rowCount;
  }
  async sortedClasses(offset) {
    const ALL_CLASSES = "SELECT * FROM classes ORDER BY id ASC LIMIT 5 OFFSET $1";
    let result = await dbQuery(ALL_CLASSES, offset);
    return result.rows;
  }
}