import { Schema, model, Document } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface IUser extends Document {
  name: string;
  email: string;
  phone: number;
  password: string;
  role: 'Job Seeker' | 'Employer';
  createdAt: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
  getJWTToken(): string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, "Please enter your Name!"],
    minLength: [3, "Name must contain at least 3 Characters!"],
    maxLength: [30, "Name cannot exceed 30 Characters!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email!"],
    validate: [validator.isEmail, "Please provide a valid Email!"],
  },
  phone: {
    type: Number,
    required: [true, "Please enter your Phone Number!"],
  },
  password: {
    type: String,
    required: [true, "Please provide a Password!"],
    minLength: [8, "Password must contain at least 8 characters!"],
    maxLength: [32, "Password cannot exceed 32 characters!"],
    select: false,
  },
  role: {
    type: String,
    required: [true, "Please select a role"],
    enum: ["Job Seeker", "Employer"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (this: IUser, next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (
  this: IUser,
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getJWTToken = function (this: IUser): string {
  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRE as any,
  };

  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY!, options);
};

export const User = model<IUser>('User', userSchema);