import React, { useEffect, useState } from 'react'
import Navbar from '../shared/Navbar'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { RadioGroup } from '../ui/radio-group'
import { Button } from '../ui/button'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { USER_API_END_POINT } from '@/utils/constant'
import { toast } from 'sonner'
import { useDispatch, useSelector } from 'react-redux'
import { setLoading } from '@/redux/authSlice'
import { Loader2 } from 'lucide-react'

const Signup = () => {
    const [step, setStep] = useState(1); // 1: signup form, 2: OTP verification
    const [userId, setUserId] = useState(null);
    const [input, setInput] = useState({
        fullname: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "",
        file: "",
        otp: ""
    });
    const [countdown, setCountdown] = useState(0);
    const { loading, user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Countdown timer for resend OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    };
    
    const changeFileHandler = (e) => {
        setInput({ ...input, file: e.target.files?.[0] });
    };
    
    const submitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("fullname", input.fullname);
        formData.append("email", input.email);
        formData.append("phoneNumber", input.phoneNumber);
        formData.append("password", input.password);
        formData.append("role", input.role);
        if (input.file) {
            formData.append("file", input.file);
        }

        try {
            dispatch(setLoading(true));
            const res = await axios.post(`${USER_API_END_POINT}/register`, formData, {
                headers: { 'Content-Type': "multipart/form-data" },
                withCredentials: true,
            });
            
            if (res.data.success) {
                setUserId(res.data.userId);
                setStep(2);
                setCountdown(60); // 60 seconds countdown for resend
                toast.success("OTP sent to your email");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            dispatch(setLoading(false));
        }
    };

    const verifyOtpHandler = async (e) => {
        e.preventDefault();
        try {
            if (!input.otp || input.otp.length !== 6) {
                toast.error("Please enter a valid 6-digit OTP");
                return;
            }
    
            dispatch(setLoading(true));
            const res = await axios.post(
                `${USER_API_END_POINT}/verify-otp`, 
                {
                    userId,
                    otp: input.otp
                }, 
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (res.data.success) {
                navigate("/login");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.error("OTP Verification Error:", error);
            
            if (error.response) {
                // The request was made and the server responded with a status code
                if (error.response.status === 404) {
                    toast.error("OTP verification endpoint not found. Check backend routes.");
                } else {
                    toast.error(error.response.data?.message || "OTP verification failed");
                }
            } else if (error.request) {
                // The request was made but no response was received
                toast.error("No response from server. Check your network connection.");
            } else {
                // Something happened in setting up the request
                toast.error("Error setting up OTP verification request");
            }
        } finally {
            dispatch(setLoading(false));
        }
    };
    
    const resendOtpHandler = async () => {
        try {
            if (countdown > 0) {
                toast.info(`Please wait ${countdown} seconds before resending`);
                return;
            }
    
            dispatch(setLoading(true));
            const res = await axios.post(
                `${USER_API_END_POINT}/resend-otp`,
                { userId },
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (res.data.success) {
                setCountdown(60);
                toast.success("New OTP sent to your email");
            }
        } catch (error) {
            console.error("Resend OTP Error:", error);
            
            if (error.response) {
                if (error.response.status === 404) {
                    toast.error("Resend OTP endpoint not found. Check backend routes.");
                } else {
                    toast.error(error.response.data?.message || "Failed to resend OTP");
                }
            } else {
                toast.error("Network error. Please try again.");
            }
        } finally {
            dispatch(setLoading(false));
        }
    };

    useEffect(() => {
        if (user) {
            navigate("/");
        }
    }, [user, navigate]);

    return (
        <div>
            <Navbar />
            <div className='flex items-center justify-center max-w-7xl mx-auto'>
                {step === 1 ? (
                    <form onSubmit={submitHandler} className='w-full md:w-1/2 border border-gray-200 rounded-md p-4 my-10'>
                        <h1 className='font-bold text-xl mb-5'>Sign Up</h1>
                        <div className='my-2'>
                            <Label>Full Name</Label>
                            <Input
                                type="text"
                                value={input.fullname}
                                name="fullname"
                                onChange={changeEventHandler}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div className='my-2'>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={input.email}
                                name="email"
                                onChange={changeEventHandler}
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                        <div className='my-2'>
                            <Label>Phone Number</Label>
                            <Input
                                type="text"
                                value={input.phoneNumber}
                                name="phoneNumber"
                                onChange={changeEventHandler}
                                placeholder="1234567890"
                                required
                            />
                        </div>
                        <div className='my-2'>
                            <Label>Password</Label>
                            <Input
                                type="password"
                                value={input.password}
                                name="password"
                                onChange={changeEventHandler}
                                placeholder="••••••••"
                                required
                                minLength="6"
                            />
                        </div>
                        <div className='flex items-center justify-between'>
                            <RadioGroup className="flex items-center gap-4 my-5">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="radio"
                                        name="role"
                                        value="student"
                                        checked={input.role === 'student'}
                                        onChange={changeEventHandler}
                                        className="cursor-pointer"
                                        required
                                    />
                                    <Label htmlFor="r1">Student</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="radio"
                                        name="role"
                                        value="recruiter"
                                        checked={input.role === 'recruiter'}
                                        onChange={changeEventHandler}
                                        className="cursor-pointer"
                                        required
                                    />
                                    <Label htmlFor="r2">Recruiter</Label>
                                </div>
                            </RadioGroup>
                            <div className='flex items-center gap-2'>
                                <Label>Profile Photo</Label>
                                <Input
                                    accept="image/*"
                                    type="file"
                                    onChange={changeFileHandler}
                                    className="cursor-pointer"
                                    required
                                />
                            </div>
                        </div>
                        {loading ? (
                            <Button className="w-full my-4" disabled>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full my-4">Signup</Button>
                        )}
                        <span className='text-sm'>Already have an account? <Link to="/login" className='text-blue-600'>Login</Link></span>
                    </form>
                ) : (
                    <form onSubmit={verifyOtpHandler} className='w-full md:w-1/2 border border-gray-200 rounded-md p-4 my-10'>
                        <h1 className='font-bold text-xl mb-5'>Verify OTP</h1>
                        <p className='mb-4'>We've sent a 6-digit OTP to your email. Please enter it below.</p>
                        
                        <div className='my-2'>
                            <Label>OTP</Label>
                            <Input
                                type="text"
                                value={input.otp}
                                name="otp"
                                onChange={changeEventHandler}
                                placeholder="Enter 6-digit OTP"
                                required
                                pattern="\d{6}"
                                maxLength="6"
                            />
                        </div>
                        
                        {loading ? (
                            <Button className="w-full my-4" disabled>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Verifying...
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full my-4">Verify OTP</Button>
                        )}
                        
                        <div className='flex justify-between mt-2'>
                            <span className='text-sm'>
                                Didn't receive OTP?{' '}
                                {countdown > 0 ? (
                                    <span className='text-gray-500'>Resend in {countdown}s</span>
                                ) : (
                                    <button 
                                        type="button" 
                                        className='text-blue-600'
                                        onClick={resendOtpHandler}
                                    >
                                        Resend
                                    </button>
                                )}
                            </span>
                            <button 
                                type="button" 
                                className='text-sm text-blue-600'
                                onClick={() => setStep(1)}
                            >
                                Back to Signup
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Signup;