const express = require('express');
const multer = require('multer');
const cors = require('cors');

require('dotenv').config();

const CVController = require('./controllers/cv-controllers');
const EmployeeController = require('./controllers/employee-controllers');
const ProjectController = require('./controllers/project-controllers');
const FilterController = require('./controllers/filter-controllers');
const MatchingController = require('./controllers/matching-controllers');
const TaskController = require('./controllers/task-controllers');
const StaffingController = require('./controllers/staffing-controllers');

const app = express();

const port = process.env.PORT || 3000;

// CORS 
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://192.168.1.58:4200',
    'http://192.168.254.53:4200'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

//  IMPORTANTE para preflight
app.use(express.json());



// MULTER
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten PDFs o DOCX'));
    }

    cb(null, true);
  }
});

// RUTAS 
app.post('/upload-cv', upload.single('cv'), CVController.uploadCV);
app.post('/projects',ProjectController.createProject);
app.post('/projects/assign', ProjectController.assignEmployee);
app.post('/filter/employees-by-project', FilterController.getEmployeesByProject);
app.post('/projects/:id/candidates/generate', MatchingController.generateAndSave);
app.post('/matching/assign', MatchingController.assignEmployees);
app.post('/projects/tasks', TaskController.createTask);
app.post('/staffing', StaffingController.obtenerStaffing);
app.get('/employees', EmployeeController.getAllEmployees);
app.get('/get-projects',ProjectController.getAllProjects)
app.get('/projects/:id/candidates/employees',MatchingController.getEmployeeCandidates);
app.get('/projects/:id/candidates/teams',MatchingController.getOptimalTeams);
app.get('/projects/get-tasks',TaskController.getAllTasks);
app.delete('/delete-task/:id',TaskController.deleteTask);
app.delete('/delete-employee/:id', EmployeeController.deleteEmployee);
app.delete('/delete-project/:id',ProjectController.deleteProject);

// SERVER
app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});