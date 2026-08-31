const fs = require('fs');
let code = fs.readFileSync('features/dashboard/onboarding/OnboardingShell.tsx', 'utf8');

const targetStr = `{title && (<div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
                            {subtitle && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">{subtitle}</p>}
                        </div>
                        {children}`;

const replacement = `{title && (<div className="mb-7 animate-fade-in text-start">
                            <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
                            {subtitle && <p className="text-base font-medium leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">{subtitle}</p>}
                        </div>)}
                        {children}`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('features/dashboard/onboarding/OnboardingShell.tsx', code, 'utf8');
    console.log('Success');
} else {
    console.log('Target not found');
}
