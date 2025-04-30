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
import { setLoading, setUser } from '@/redux/authSlice'
import { Loader2 } from 'lucide-react'

const Login = () => {
    const [step, setStep] = useState(1); // 1: login form, 2: OTP verification
    const [userId, setUserId] = useState(null);
    const [input, setInput] = useState({
        email: "",
        password: "",
        role: "",
        otp: ""
    });
    const [countdown, setCountdown] = useState(0);
    const { loading, user } = useSelector(store => store.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    }

    const submitHandler = async (e) => {
        e.preventDefault();
        try {
            dispatch(setLoading(true));
            const res = await axios.post(`${USER_API_END_POINT}/login`, {
                email: input.email,
                password: input.password,
                role: input.role
            }, {
                headers: { "Content-Type": "application/json" },
                withCredentials: true,
            });
            
            if (res.data.success) {
                dispatch(setUser(res.data.user));
                navigate("/");
                toast.success(res.data.message);
            }
        } catch (error) {
            console.log("Login error:", error);
            if (error.response?.data?.success === false && 
                error.response?.data?.isOtpVerified === false) {
                // Show OTP verification screen
                setUserId(error.response.data.userId);
                setStep(2); // Switch to OTP verification step
                setCountdown(60); // Start countdown for resend
                toast.error(error.response.data.message || "Please verify your account with OTP first");
            } else {
                toast.error(error.response?.data?.message || "Login failed");
            }
        } finally {
            dispatch(setLoading(false));
        }
    }

    const verifyOtpHandler = async (e) => {
        e.preventDefault();
        try {
            dispatch(setLoading(true));
            const res = await axios.post(`${USER_API_END_POINT}/verify-otp`, {
                userId,
                otp: input.otp
            }, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (res.data.success) {
                toast.success(res.data.message);
                setStep(1); // Go back to login form
                setInput({...input, otp: ""}); // Clear OTP field
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "OTP verification failed");
        } finally {
            dispatch(setLoading(false));
        }
    }

    const resendOtpHandler = async () => {
        try {
            dispatch(setLoading(true));
            const res = await axios.post(`${USER_API_END_POINT}/resend-otp`, {
                userId
            }, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (res.data.success) {
                setCountdown(60); // Reset countdown
                toast.success("New OTP sent to your email");
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Failed to resend OTP");
        } finally {
            dispatch(setLoading(false));
        }
    }

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

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
                        <h1 className='font-bold text-xl mb-5'>Login</h1>
                        <div className='my-2'>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={input.email}
                                name="email"
                                onChange={changeEventHandler}
                                placeholder="example@email.com"
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
                        </div>
                        {loading ? (
                            <Button className="w-full my-4" disabled>
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full my-4">Login</Button>
                        )}
                        <span className='text-sm'>Don't have an account? <Link to="/signup" className='text-blue-600'>Signup</Link></span>
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
                                Back to Login
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default Login