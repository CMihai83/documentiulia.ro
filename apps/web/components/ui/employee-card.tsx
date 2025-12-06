'use client';

import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download,
  Send,
  DollarSign,
  TrendingUp,
  Award,
  GraduationCap,
  Heart,
  Cake,
  Home,
  Car,
  Wallet,
  Receipt,
  Calculator,
  Shield,
  Star,
  Users,
  Search,
  Filter,
  Plus,
  ChevronRight,
  BadgeCheck,
  ContactRound,
} from 'lucide-react';

// Types
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'probation';
export type ContractType = 'full_time' | 'part_time' | 'contractor' | 'intern' | 'temporary';
export type Department = 'management' | 'sales' | 'marketing' | 'finance' | 'hr' | 'it' | 'operations' | 'support' | 'other';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cnp?: string;
  avatar?: string;
  position: string;
  department: Department;
  status: EmployeeStatus;
  contractType: ContractType;
  hireDate: string;
  terminationDate?: string;
  salary?: {
    gross: number;
    net: number;
    currency: string;
  };
  manager?: {
    id: string;
    name: string;
    avatar?: string;
  };
  address?: string;
  birthDate?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  benefits?: string[];
  skills?: string[];
  education?: string;
  certifications?: string[];
  leaveBalance?: {
    annual: number;
    sick: number;
    used: number;
  };
  workSchedule?: string;
  bankAccount?: string;
  taxDeductions?: number;
}

export interface EmployeeCardProps {
  employee: Employee;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSendPayslip?: () => void;
  onViewPayroll?: () => void;
  variant?: 'default' | 'compact' | 'detailed' | 'row';
  selected?: boolean;
  onSelect?: () => void;
  showSalary?: boolean;
  className?: string;
}

export interface EmployeeListProps {
  employees: Employee[];
  onEmployeeClick?: (employee: Employee) => void;
  variant?: 'grid' | 'list' | 'table';
  showFilters?: boolean;
  showSalary?: boolean;
  className?: string;
}

// Helper functions
const getStatusConfig = (status: EmployeeStatus) => {
  switch (status) {
    case 'active':
      return {
        label: 'Activ',
        color: 'text-green-600 bg-green-100 dark:bg-green-950/30',
        icon: CheckCircle2,
      };
    case 'inactive':
      return {
        label: 'Inactiv',
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: XCircle,
      };
    case 'on_leave':
      return {
        label: 'Concediu',
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/30',
        icon: Calendar,
      };
    case 'terminated':
      return {
        label: 'Încheiat',
        color: 'text-red-600 bg-red-100 dark:bg-red-950/30',
        icon: XCircle,
      };
    case 'probation':
      return {
        label: 'Probă',
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/30',
        icon: Clock,
      };
    default:
      return {
        label: status,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
        icon: User,
      };
  }
};

const getContractTypeConfig = (type: ContractType) => {
  switch (type) {
    case 'full_time':
      return { label: 'Normă întreagă', color: 'text-green-600' };
    case 'part_time':
      return { label: 'Part-time', color: 'text-blue-600' };
    case 'contractor':
      return { label: 'Colaborator', color: 'text-purple-600' };
    case 'intern':
      return { label: 'Stagiar', color: 'text-cyan-600' };
    case 'temporary':
      return { label: 'Temporar', color: 'text-amber-600' };
    default:
      return { label: type, color: 'text-slate-600' };
  }
};

const getDepartmentConfig = (department: Department) => {
  switch (department) {
    case 'management':
      return { label: 'Management', icon: Building2, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30' };
    case 'sales':
      return { label: 'Vânzări', icon: TrendingUp, color: 'bg-green-100 text-green-700 dark:bg-green-950/30' };
    case 'marketing':
      return { label: 'Marketing', icon: Star, color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30' };
    case 'finance':
      return { label: 'Financiar', icon: Calculator, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30' };
    case 'hr':
      return { label: 'Resurse Umane', icon: Users, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30' };
    case 'it':
      return { label: 'IT', icon: Shield, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30' };
    case 'operations':
      return { label: 'Operațiuni', icon: Briefcase, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' };
    case 'support':
      return { label: 'Suport', icon: Heart, color: 'bg-red-100 text-red-700 dark:bg-red-950/30' };
    default:
      return { label: 'Altele', icon: Building2, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800' };
  }
};

const formatCurrency = (amount: number, currency: string = 'RON'): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
};

const getTenure = (hireDate: string): string => {
  const hire = new Date(hireDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor(((now.getTime() - hire.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

  if (years === 0) {
    return `${months} luni`;
  }
  return years === 1 ? `${years} an` : `${years} ani`;
};

// Employee Status Badge Component
export function EmployeeStatusBadge({
  status,
  size = 'default',
  showIcon = true,
  className,
}: {
  status: EmployeeStatus;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  className?: string;
}) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    default: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />}
      {config.label}
    </span>
  );
}

// Department Badge Component
export function DepartmentBadge({
  department,
  className,
}: {
  department: Department;
  className?: string;
}) {
  const config = getDepartmentConfig(department);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium',
        config.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

// Employee Avatar Component
function EmployeeAvatar({
  employee,
  size = 'default',
  showStatus = false,
}: {
  employee: Employee;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  showStatus?: boolean;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    default: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-slate-400',
    on_leave: 'bg-blue-500',
    terminated: 'bg-red-500',
    probation: 'bg-amber-500',
  };

  return (
    <div className="relative">
      {employee.avatar ? (
        <img
          src={employee.avatar}
          alt={`${employee.firstName} ${employee.lastName}`}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-semibold text-white',
            sizeClasses[size]
          )}
        >
          {getInitials(employee.firstName, employee.lastName)}
        </div>
      )}
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900',
            statusSizes[size],
            statusColors[employee.status]
          )}
        />
      )}
    </div>
  );
}

// Leave Balance Component
export function LeaveBalance({
  leaveBalance,
  className,
}: {
  leaveBalance: Employee['leaveBalance'];
  className?: string;
}) {
  if (!leaveBalance) return null;

  const totalAvailable = leaveBalance.annual + leaveBalance.sick;
  const usedPercent = (leaveBalance.used / totalAvailable) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">Zile concediu</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {leaveBalance.used} / {totalAvailable} folosite
        </span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${usedPercent}%` }}
          className="h-full bg-blue-500 rounded-full"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>CO: {leaveBalance.annual} zile</span>
        <span>CM: {leaveBalance.sick} zile</span>
      </div>
    </div>
  );
}

// Main Employee Card Component
export function EmployeeCard({
  employee,
  onView,
  onEdit,
  onDelete,
  onSendPayslip,
  onViewPayroll,
  variant = 'default',
  selected = false,
  onSelect,
  showSalary = false,
  className,
}: EmployeeCardProps) {
  const [showActions, setShowActions] = useState(false);
  const fullName = `${employee.firstName} ${employee.lastName}`;

  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={onView}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 cursor-pointer transition-all',
          selected && 'ring-2 ring-blue-500 border-blue-500',
          'hover:border-slate-300 dark:hover:border-slate-600',
          className
        )}
      >
        <EmployeeAvatar employee={employee} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {fullName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {employee.position}
          </p>
        </div>
        <DepartmentBadge department={employee.department} />
      </motion.div>
    );
  }

  if (variant === 'row') {
    return (
      <motion.tr
        whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
        className={cn(
          'border-b transition-colors cursor-pointer',
          selected && 'bg-blue-50 dark:bg-blue-950/20',
          className
        )}
        onClick={onView}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <EmployeeAvatar employee={employee} size="sm" showStatus />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {employee.email}
              </p>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <p className="text-sm text-slate-900 dark:text-slate-100">
            {employee.position}
          </p>
        </td>
        <td className="py-3 px-4">
          <DepartmentBadge department={employee.department} />
        </td>
        <td className="py-3 px-4">
          <span className={cn('text-xs', getContractTypeConfig(employee.contractType).color)}>
            {getContractTypeConfig(employee.contractType).label}
          </span>
        </td>
        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
          {formatDate(employee.hireDate)}
        </td>
        {showSalary && employee.salary && (
          <td className="py-3 px-4 text-right">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(employee.salary.gross, employee.salary.currency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">brut</p>
          </td>
        )}
        <td className="py-3 px-4">
          <EmployeeStatusBadge status={employee.status} size="sm" />
        </td>
        <td className="py-3 px-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-slate-500" />
          </button>
        </td>
      </motion.tr>
    );
  }

  if (variant === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm',
          selected && 'ring-2 ring-blue-500',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <EmployeeAvatar employee={employee} size="xl" showStatus />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {fullName}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  {employee.position}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <DepartmentBadge department={employee.department} />
                  <EmployeeStatusBadge status={employee.status} />
                </div>
              </div>
              {showSalary && employee.salary && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(employee.salary.gross, employee.salary.currency)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    salariu brut lunar
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    {formatCurrency(employee.salary.net, employee.salary.currency)} net
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {employee.email}
            </span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {employee.phone}
              </span>
            </div>
          )}
          {employee.cnp && (
            <div className="flex items-center gap-2">
              <ContactRound className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                CNP: {employee.cnp.substring(0, 6)}...
              </span>
            </div>
          )}
          {employee.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                {employee.address}
              </span>
            </div>
          )}
        </div>

        {/* Employment Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tip contract</p>
            <p className={cn('text-sm font-medium', getContractTypeConfig(employee.contractType).color)}>
              {getContractTypeConfig(employee.contractType).label}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Data angajării</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatDate(employee.hireDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Vechime</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {getTenure(employee.hireDate)}
            </p>
          </div>
          {employee.workSchedule && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Program</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {employee.workSchedule}
              </p>
            </div>
          )}
        </div>

        {/* Manager */}
        {employee.manager && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Manager direct</p>
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg inline-flex">
              <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs">
                {employee.manager.avatar ? (
                  <img src={employee.manager.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  employee.manager.name[0]
                )}
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {employee.manager.name}
              </span>
            </div>
          </div>
        )}

        {/* Leave Balance */}
        {employee.leaveBalance && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Concediu</p>
            <LeaveBalance leaveBalance={employee.leaveBalance} />
          </div>
        )}

        {/* Skills & Certifications */}
        {(employee.skills || employee.certifications) && (
          <div className="mb-6 space-y-4">
            {employee.skills && employee.skills.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Competențe</p>
                <div className="flex flex-wrap gap-2">
                  {employee.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {employee.certifications && employee.certifications.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Certificări</p>
                <div className="flex flex-wrap gap-2">
                  {employee.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="text-xs px-2 py-1 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded flex items-center gap-1"
                    >
                      <Award className="h-3 w-3" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Benefits */}
        {employee.benefits && employee.benefits.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Beneficii</p>
            <div className="flex flex-wrap gap-2">
              {employee.benefits.map((benefit) => (
                <span
                  key={benefit}
                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 rounded"
                >
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {onView && (
              <button
                onClick={onView}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Dosar</span>
              </button>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Editează</span>
              </button>
            )}
            {onViewPayroll && (
              <button
                onClick={onViewPayroll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Receipt className="h-4 w-4" />
                <span>Salarizare</span>
              </button>
            )}
          </div>
          {onSendPayslip && (
            <button
              onClick={onSendPayslip}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Send className="h-4 w-4" />
              <span>Trimite fluturaș</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'p-4 rounded-xl border bg-white dark:bg-slate-900 transition-all cursor-pointer',
        selected && 'ring-2 ring-blue-500 border-blue-500',
        'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600',
        className
      )}
      onClick={onView}
    >
      <div className="flex items-start gap-4">
        <EmployeeAvatar employee={employee} showStatus />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {fullName}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {employee.position}
              </p>
            </div>
            <EmployeeStatusBadge status={employee.status} size="sm" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <DepartmentBadge department={employee.department} />
            <span className={cn('text-xs', getContractTypeConfig(employee.contractType).color)}>
              {getContractTypeConfig(employee.contractType).label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{getTenure(employee.hireDate)}</span>
            </div>
            {showSalary && employee.salary && (
              <div className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                <span>{formatCurrency(employee.salary.gross, employee.salary.currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Employee List Component
export function EmployeeList({
  employees,
  onEmployeeClick,
  variant = 'grid',
  showFilters = false,
  showSalary = false,
  className,
}: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        !searchQuery ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchQuery, departmentFilter]);

  if (variant === 'table') {
    return (
      <div className={cn('overflow-x-auto', className)}>
        {showFilters && (
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută angajați..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Angajat</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Poziție</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Departament</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Contract</th>
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Data angajării</th>
              {showSalary && (
                <th className="py-3 px-4 text-xs font-medium text-slate-500 text-right">Salariu</th>
              )}
              <th className="py-3 px-4 text-xs font-medium text-slate-500">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                variant="row"
                onView={() => onEmployeeClick?.(employee)}
                showSalary={showSalary}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={className}>
      {showFilters && (
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută angajați..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          variant === 'grid'
            ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        )}
      >
        {filteredEmployees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            variant={variant === 'list' ? 'compact' : 'default'}
            onView={() => onEmployeeClick?.(employee)}
            showSalary={showSalary}
          />
        ))}
      </div>
    </div>
  );
}

// Employee Summary Component
export function EmployeeSummary({
  employees,
  className,
}: {
  employees: Employee[];
  className?: string;
}) {
  const summary = useMemo(() => {
    const active = employees.filter((e) => e.status === 'active').length;
    const onLeave = employees.filter((e) => e.status === 'on_leave').length;
    const probation = employees.filter((e) => e.status === 'probation').length;
    const totalSalary = employees
      .filter((e) => e.salary && e.status === 'active')
      .reduce((sum, e) => sum + (e.salary?.gross || 0), 0);

    return { total: employees.length, active, onLeave, probation, totalSalary };
  }, [employees]);

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-5 gap-4', className)}>
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total angajați</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {summary.total}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30">
        <p className="text-sm text-green-600 dark:text-green-400 mb-1">Activi</p>
        <p className="text-2xl font-bold text-green-700 dark:text-green-300">
          {summary.active}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30">
        <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">În concediu</p>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
          {summary.onLeave}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">Perioadă probă</p>
        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
          {summary.probation}
        </p>
      </div>
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30">
        <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Fond salarii</p>
        <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
          {formatCurrency(summary.totalSalary)}
        </p>
      </div>
    </div>
  );
}

// Empty State Component
export function EmployeeEmptyState({
  onAddEmployee,
  className,
}: {
  onAddEmployee?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl',
        className
      )}
    >
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
        <Users className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
        Niciun angajat adăugat
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Adăugați angajații pentru a gestiona salarizarea
      </p>
      {onAddEmployee && (
        <button
          onClick={onAddEmployee}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Adaugă angajat</span>
        </button>
      )}
    </motion.div>
  );
}

export default EmployeeCard;
