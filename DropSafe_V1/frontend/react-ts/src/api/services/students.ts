import { EP } from '../endpoints';
import { get, post } from '../http';
import type { Enrollment, Prediction, Student, StudentDetail } from '../../types/models';
import type { StudentStatus } from '../../types/enums';

export interface StudentListRow extends Student {
  primaryIdentifier?: string;
  enrollment?: Enrollment;
  latestPrediction?: Prediction;
}

export const listStudents = (q?: string, status?: StudentStatus | '') =>
  get<StudentListRow[]>(EP.students.path, { q, status });

export const createStudent = (body: {
  firstName: string;
  lastName: string;
  identifierType: string;
  identifierValue: string;
  email?: string;
  phone?: string;
  guardianName?: string;
}) => post(EP.createStudent.path, body);

export const getStudent = (id: string) => get<StudentDetail>(EP.student(id).path);

export const myStudents = () => get<StudentListRow[]>(EP.mentorStudents.path);
