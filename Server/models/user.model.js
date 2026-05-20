const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'email은 필수입니다.'],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, 'name은 필수입니다.'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'password는 필수입니다.'],
    },
    user_type: {
      type: String,
      required: true,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
