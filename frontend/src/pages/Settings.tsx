import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import styled from "styled-components";
import ProfileBeeIcon from "../components/icons/ProfileBeeIcon.tsx";
import BackButton from "../components/navigation/BackButton";
import {ROUTES} from "../constants/Routes.ts";
import { useNavigate } from "react-router-dom";
import OnboardingSurvey from "../components/onboardingComponents/OnboardingSurvey.tsx";

const PageBackButton = styled(BackButton)`
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    color: #AFDBFF;
`;

const Page = styled.div`
    width: 100vw;
    height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;

    [data-theme="dark"] & {
        background: #9f95c6;
    }
`;

const TopBar = styled.div`
    width: 100%;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    position: relative;
`;

const PageTitle = styled.div`
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: clamp(0.7rem, 1rem, 1.3rem);
    font-weight: 600;
    color: #4B94DB;
    letter-spacing: 0.04em;
    margin-top: 0.3rem;

    [data-theme="dark"] & {
        color: #c8c0f0;
    }
`;

const Card = styled.div`
    margin-top: 40px;
    width: 100%;
    max-width: 480px;
    background: #f5f5f5;
    border-radius: 16px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    [data-theme="dark"] & {
        background: #857bb5;
    }
`;

const CardTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 800;
    color: #222;
    margin: 0 0 12px;

    [data-theme="dark"] & {
        color: #f0ecf8;
    }
`;

const ProfileBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding-bottom: 20px;
    width: 100%;
`;

const AvatarWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;

const BeeIcon = styled(ProfileBeeIcon)`
    width: clamp(70px, 90px, 110px);
    height: clamp(70px, 90px, 110px);
`;

const UserName = styled.div`
    font-weight: 700;
    font-size: 1.5em;
    color: #636363;
    text-align: center;

    [data-theme="dark"] & {
        color: #e0d8f0;
    }
`;

const UserSub = styled.div`
    color: #636363;
    text-align: center;

    [data-theme="dark"] & {
        color: #c8c0e8;
    }
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #ddd;
    width: 100%;
    margin: 0 auto;

    [data-theme="dark"] & {
        border-top-color: #6e65a0;
    }
`;

const SettingRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
`;

const SettingLabel = styled.span`
    font-size: 0.9rem;
    color: #333;

    [data-theme="dark"] & {
        color: #e0d8f0;
    }
`;

const ToggleTrack = styled.button<{ $dark: boolean }>`
    width: 64px;
    height: 32px;
    border-radius: 16px;
    border: none;
    cursor: pointer;
    background: ${p => p.$dark ? "#2d2558" : "#AFDBFF"};
    position: relative;
    transition: background 0.3s;
    padding: 0;
    flex-shrink: 0;
`;

const ToggleKnob = styled.div<{ $dark: boolean }>`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${p => p.$dark ? "#1a1535" : "white"};
    position: absolute;
    top: 3px;
    left: ${p => p.$dark ? "35px" : "3px"};
    transition: left 0.3s, background 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
`;

function SunIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="3.5" fill="#f5a623"/>
            <line x1="7.5" y1="0.5" x2="7.5" y2="2.5" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="7.5" y1="12.5" x2="7.5" y2="14.5" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="0.5" y1="7.5" x2="2.5" y2="7.5" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12.5" y1="7.5" x2="14.5" y2="7.5" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2.55" y1="2.55" x2="3.96" y2="3.96" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="11.04" y1="11.04" x2="12.45" y2="12.45" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="12.45" y1="2.55" x2="11.04" y2="3.96" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3.96" y1="11.04" x2="2.55" y2="12.45" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M12.5 9.5A5.5 5.5 0 0 1 5 2a5.5 5.5 0 1 0 7.5 7.5z" fill="#c8c0f0"/>
        </svg>
    );
}

const ActionBtn = styled.button`
    background: none;
    border: none;
    padding: 10px 0;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
    color: #333;
    font-weight: 600;
    &:hover { color: #111; }
    transition: color 0.15s;

    [data-theme="dark"] & {
        color: #e0d8f0;
        &:hover { color: #fff; }
    }
`;

export default function SettingsPage() {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [showPreferences, setShowPreferences] = useState(false);
    const navigate = useNavigate();

    return (
        <Page>
            <PageBackButton to={ROUTES.HOME} label="Home" />
            <TopBar>
                <PageTitle>ClockIn</PageTitle>
            </TopBar>

            <Card>
                <CardTitle>Your Account</CardTitle>

                <ProfileBox>
                    <AvatarWrapper>
                        <BeeIcon />
                    </AvatarWrapper>
                    <UserName>{user?.email?.split("@")[0] ?? "User"}</UserName>
                    <UserSub>(username)</UserSub>
                </ProfileBox>

                <Divider />

                <SettingRow>
                    <SettingLabel>Theme</SettingLabel>
                    <ToggleTrack $dark={isDark} onClick={toggleTheme} aria-label="Toggle dark mode">
                        <ToggleKnob $dark={isDark}>
                            {isDark ? <MoonIcon /> : <SunIcon />}
                        </ToggleKnob>
                    </ToggleTrack>
                </SettingRow>

                <Divider />

                <ActionBtn onClick={() => navigate("/availability")}>
                    📅 My Availability
                </ActionBtn>

                <Divider />

                <ActionBtn onClick={() => setShowPreferences(true)}>
                    📋 Edit Study Preferences
                </ActionBtn>

                <Divider />

                <ActionBtn>
                    Change Username or Password
                </ActionBtn>

                <Divider />
            </Card>

            {showPreferences && user && (
                <OnboardingSurvey
                    userId={user.id}
                    onComplete={() => setShowPreferences(false)}
                    isReopening
                />
            )}
        </Page>
    );
}
