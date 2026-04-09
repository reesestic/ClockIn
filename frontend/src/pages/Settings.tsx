import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styled from "styled-components";
import ProfileBeeIcon from "../components/icons/ProfileBeeIcon.tsx";
import BackButton from "../components/navigation/BackButton";
import {ROUTES} from "../constants/Routes.ts";
import { useNavigate } from "react-router-dom";

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
`;

const CardTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 800;
    color: #222;
    margin: 0 0 12px;
`;

/* ── Box 1: Avatar + Name ── */
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
`;

const UserSub = styled.div`
    color: #636363;
    text-align: center;
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #ddd;
    width: 100%;
    margin: 0 auto;
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
`;

const Toggle = styled.button<{ $on: boolean }>`
    width: 44px;
    height: 24px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    background: ${p => p.$on ? "#4a90d9" : "#ccc"};
    position: relative;
    transition: background 0.2s;

    &::after {
        content: "";
        position: absolute;
        top: 3px;
        left: ${p => p.$on ? "23px" : "3px"};
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        transition: left 0.2s;
    }
`;

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
`;

export default function SettingsPage() {
    const { user } = useAuth();
    const [darkMode, setDarkMode] = useState(false);
    const navigate = useNavigate(); // add

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
                    <Toggle $on={darkMode} onClick={() => setDarkMode(p => !p)} />
                </SettingRow>

                <Divider />

                {/* 🔥 NEW ROW */}
                <ActionBtn onClick={() => navigate("/availability")}>
                    📅 My Availability
                </ActionBtn>

                <Divider />

                <ActionBtn>
                    Change Username or Password
                </ActionBtn>

                <Divider />
            </Card>
        </Page>
    );
}