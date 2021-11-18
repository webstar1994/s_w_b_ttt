const path = require('path');
const fsPromise = require("fs").promises;/* API to create new Item */
const fs = require('fs');
const core_func = require('./core_func');
let getFileSize = (rt)=>{
  var stats = fs.statSync(path.join(`${__dirname}/../../${rt}`));
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}
let sizeOfFile = (paths)=>{
  var stats = fs.statSync(paths);
  var fileSizeInBytes = stats.size;
  return core_func.formatBytes(fileSizeInBytes);
}
let byteOfFile = (paths)=>{
  var stats = fs.statSync(paths);
  var fileSizeInBytes = stats.size;
  return stats.size;
}
async function downloadFile (filePath,fileName) {  
  const writer = fs.createWriteStream(fileName);
  const response = await axios({
    url:filePath,
    method: 'GET',
    responseType: 'stream'
  })
  const pipe_r = response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    pipe_r.on('finish', function(){
     return resolve(true);
    })
    pipe_r.on('error', function(){
      return reject;
     })
  })
}
async function writeFile(fileData,filePath) {
  try {
    const data = await fsPromise.writeFile(filePath,fileData);
    return true;
  } catch (error) {
    console.log(error)
    return false;
  }
}
async function createDir(dir) {
  try {
    if (!fs.existsSync(dir)){
     await fsPromise.mkdir(dir);
    }
    return true;
  } catch (error) {
    console.log(error)
    return false;
  }
}
async function readFile(filePath) {
  try {
    const data = await fsPromise.readFile(filePath);
    return data;
  } catch (error) {
    return false;
  }
}
async function copyFile(from,to) {
  try {
    await fsPromise.copyFile(from,to);
    return true;
  } catch (error) {
    return false;
  }
}
async function delFile(filePath) {
  try {
    const data = await fsPromise.unlink(filePath);
    return data;
  } catch (error) {
    console.log(error)
    return false;
  }
}
async function delFolder(filePath) {
  try {
    const files = await fsPromise.rmdir(filePath,{ recursive: true, force: true });
    return files;
  } catch (error) {
    console.log(error)
    return false;
  }
}
function readFileSync(filePath) {
  try {
    const data = fs.readFileSync(filePath,'UTF-8');
    return data;
  } catch (error) {
    console.log(error)
    return false;
  }
}
async function readfolder(filePath) {
  try {
    const files = await fsPromise.readdir(filePath);
    return files;
  } catch (error) {
    // console.log(error)
    return false;
  }
}
module.exports = {
  getFileSize,
  readFile,
  readFileSync,
  writeFile,
  createDir,
  readfolder,
  delFolder,
  sizeOfFile,
  delFile,
  copyFile,
  byteOfFile,
}