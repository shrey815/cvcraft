import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true, minlength: 6, select: false },
    college: { type: String, trim: true, maxlength: 120 },
    course: { type: String, trim: true, maxlength: 80 },
    graduationYear: { type: Number }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const { _id, name, email, college, course, graduationYear, createdAt } = this;
  return { id: _id, name, email, college, course, graduationYear, createdAt };
};

export default mongoose.model('User', userSchema);
