const fs = require('fs');
let code = fs.readFileSync('features/dashboard/OnboardingPage.tsx', 'utf8');

const targetStr = `    // Sans classe, l'emploi du temps ne peut pas être rempli : « Ignorer »
    // termine directement la configuration au lieu de passer à l'étape 5.
    const showIgnoreClass = navigation.step === 4 && classes.length === 0;

    let content: ReactNode;
    if (navigation.step === 1) {
        content = <LanguageStep lang={lang} copy={copy} onSelect={handleLanguageSelect} />;
    } else if (navigation.step === 2) {
        content = (
            <ProfileStep
                teacherName={config.defaultTeacherName ?? ''}
                establishmentName={config.establishmentName ?? ''}
                cycles={selectedCycles}
                copy={copy}
                onTeacherNameChange={handleTeacherNameChange}
                onEstablishmentChange={handleEstablishmentChange}
                onCyclesChange={handleCyclesChange}
            />
        );
    } else if (navigation.step === 3) {
        content = (
            <SubjectsStep
                subjects={subjectOptions}
                selectedSubjects={selectedSubjects}
                teacherName={config.defaultTeacherName ?? ''}
                lang={lang}
                copy={copy}
                onToggle={handleSubjectToggle}
            />
        );
    } else if (navigation.step === 4) {
        content = (
            <ClassesStep
                classes={classes}
                cycle={cycle}
                cycles={selectedCycles}
                lang={lang}
                copy={copy}
                selectedSubjects={selectedSubjects}
                onCreateClass={onCreateClass}
                controller={classDraft}
                onRemove={handleRemoveClass}
                onConfigChange={onConfigChange}
                onCycleChange={setClassCycle}
            />
        );
    } else {
        content = (
            <Suspense fallback={<div className="py-10 text-center text-sm font-medium text-slate-500">{copy.sectionSchedule}…</div>}>
                <ScheduleStep classes={classes} config={config} onConfigChange={onConfigChange} />
            </Suspense>
        );
    }

    return (
        <OnboardingShell
            lang={lang}
            step={navigation.step}
            title={titleForStep(copy, navigation.step, lang)}
            subtitle={navigation.step === 1 ? copy.subtitle : undefined}
            canContinue={navigation.canContinue}
            finishing={finishing}
            canComplete={(config.timetable?.length ?? 0) > 0}
            copy={copy}
            onBack={navigation.back}
            onNext={navigation.next}
            onComplete={handleComplete}
            onSkip={onSkip}
            showIgnore={showIgnoreClass}
            onIgnore={handleComplete}
        >
            {content}
        </OnboardingShell>
    );
};`;

const replacement = `    // Sans classe, l'emploi du temps ne peut pas être rempli : « Ignorer »
    // termine directement la configuration au lieu de passer à l'étape suivante.
    const showIgnoreClass = navigation.step === 5 && classes.length === 0;

    let content: ReactNode;
    if (navigation.step === 1) {
        content = <LanguageStep lang={lang} copy={copy} onSelect={handleLanguageSelect} />;
    } else if (navigation.step === 2) {
        content = (
            <ThemeStep
                theme={config.theme || 'light'}
                onThemeChange={(theme) => onConfigChange({ theme })}
                copy={copy}
                isRtl={lang === 'ar'}
            />
        );
    } else if (navigation.step === 3) {
        content = (
            <ProfileStep
                teacherName={config.defaultTeacherName ?? ''}
                establishmentName={config.establishmentName ?? ''}
                cycles={selectedCycles}
                copy={copy}
                onTeacherNameChange={handleTeacherNameChange}
                onEstablishmentChange={handleEstablishmentChange}
                onCyclesChange={handleCyclesChange}
            />
        );
    } else if (navigation.step === 4) {
        content = (
            <SubjectsStep
                subjects={subjectOptions}
                selectedSubjects={selectedSubjects}
                teacherName={config.defaultTeacherName ?? ''}
                lang={lang}
                copy={copy}
                onToggle={handleSubjectToggle}
            />
        );
    } else if (navigation.step === 5) {
        content = (
            <ClassesStep
                classes={classes}
                cycle={cycle}
                cycles={selectedCycles}
                lang={lang}
                copy={copy}
                selectedSubjects={selectedSubjects}
                onCreateClass={onCreateClass}
                controller={classDraft}
                onRemove={handleRemoveClass}
                onConfigChange={onConfigChange}
                onCycleChange={setClassCycle}
            />
        );
    } else if (navigation.step === 6) {
        content = (
            <Suspense fallback={<div className="py-10 text-center text-sm font-medium text-slate-500">{copy.sectionSchedule}…</div>}>
                <ScheduleStep classes={classes} config={config} onConfigChange={onConfigChange} />
            </Suspense>
        );
    } else {
        content = <PrimingStep copy={copy} isRtl={lang === 'ar'} onFinished={handleComplete} />;
    }

    return (
        <OnboardingShell
            lang={lang}
            step={navigation.step}
            title={titleForStep(copy, navigation.step, lang)}
            subtitle={navigation.step === 1 ? copy.subtitle : undefined}
            canContinue={navigation.canContinue}
            finishing={finishing}
            canComplete={(config.timetable?.length ?? 0) > 0}
            copy={copy}
            onBack={navigation.back}
            onNext={navigation.step === 6 ? () => navigation.next() : navigation.next}
            onComplete={navigation.step === 6 ? () => navigation.next() : handleComplete}
            onSkip={onSkip}
            showIgnore={showIgnoreClass}
            onIgnore={() => navigation.next()}
        >
            {content}
        </OnboardingShell>
    );
};`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('features/dashboard/OnboardingPage.tsx', code, 'utf8');
    console.log('Success');
} else {
    console.log('Target not found');
}
