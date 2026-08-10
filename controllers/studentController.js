const studentService = require('../services/studentService');
const response = require('../utils/apiResponse');
const commService = require('../services/communicationService');
const db = require('../config/db');
const logger = require('../utils/logger');

// ✅ Get all students
exports.getAllStudents = async (req, res, next) => {
  try {
    const students = await studentService.getAllStudents(req.user, req.query);
    return response.success(res, students, "Students fetched successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Get student by ID
exports.getStudent = async (req, res, next) => {
  const { id } = req.params;
  try {
    const student = await studentService.getStudentById(id, req.user);
    if (!student) return response.error(res, "Student not found", 404);
    return response.success(res, student);
  } catch (err) {
    next(err);
  }
};

// ✅ Create a new student (Admission)
exports.createStudent = async (req, res, next) => {
  try {
    const studentData = {
      school_id: req.body.school_id || req.user.school_id,
      garrison_id: req.body.garrison_id || req.user.garrison_id,
      ...req.body
    };

    const student = await studentService.createStudent(studentData);

    // Trigger Admission SMS
    this.triggerAdmissionNotification(student.id);

    return response.success(res, student, "Student created successfully", 201);
  } catch (err) {
    next(err);
  }
};

exports.triggerAdmissionNotification = async (studentId) => {
    try {
        const [rows] = await db.query(`
            SELECT s.*, p.phone_number, p.email, sch.name as school_name
            FROM students s
            LEFT JOIN parents p ON s.parent_id = p.id
            LEFT JOIN schools sch ON s.school_id = sch.id
            WHERE s.id = ?
        `, [studentId]);

        const student = rows[0];
        if (!student) return;

        const commSettings = await commService.loadSettings().then(() => commService.settings);
        const message = `GARRISON ADMISSION: Congratulations! ${student.first_name} ${student.last_name} has been admitted to ${student.school_name}. Student ID: ${studentId.substring(0,8).toUpperCase()}. Welcome to the Directorate.`;

        if (commSettings.enable_sms_admissions && student.phone_number) {
            await commService.sendSMS(student.phone_number, message);
        }
    } catch (err) {
        logger.error('Admission SMS Error: ' + err.message);
    }
};

// ✅ Update student details
exports.updateStudent = async (req, res, next) => {
  const { id } = req.params;
  try {
    const student = await studentService.updateStudent(id, req.body, req.user);
    return response.success(res, student, "Student updated successfully");
  } catch (err) {
    next(err);
  }
};

// ✅ Delete student by ID
exports.deleteStudent = async (req, res, next) => {
  const { id } = req.params;
  try {
    await studentService.deleteStudent(id, req.user);
    return response.success(res, null, "Student deleted successfully");
  } catch (err) {
    next(err);
  }
};

// 🚀 Promote student
exports.promoteStudent = async (req, res, next) => {
  const { id } = req.params;
  const { newClassId } = req.body;
  try {
    await studentService.promoteStudent(id, newClassId);
    return response.success(res, null, "Student promoted successfully");
  } catch (err) {
    next(err);
  }
};

// 🚀 Transfer student
exports.transferStudent = async (req, res, next) => {
  const { id } = req.params;
  const { school_id, class_id } = req.body;
  try {
    await studentService.transferStudent(id, school_id, class_id);
    return response.success(res, null, "Student transferred successfully");
  } catch (err) {
    next(err);
  }
};

// 🚀 Get students by class
exports.getStudentsByClass = async (req, res, next) => {
  const { class_id } = req.params;
  try {
    const students = await studentService.getStudentsByClass(class_id);
    return response.success(res, students);
  } catch (err) {
    next(err);
  }
};

// 🚀 Get students by school
exports.getStudentsBySchool = async (req, res, next) => {
  const { school_id } = req.params;
  try {
    const students = await studentService.getStudentsBySchool(school_id);
    return response.success(res, students);
  } catch (err) {
    next(err);
  }
};
