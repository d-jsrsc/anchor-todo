use anchor_lang::prelude::*;

use crate::name_seed;

#[derive(Accounts)]
#[instruction(name: String, capacity: u16, list_bump: u8)]
pub struct NewList<'info> {
    #[account(
        init,
        payer = user,
        space = TodoList::space(&name, capacity),
        seeds = [
            b"todolist",
            user.to_account_info().key.as_ref(),
            name_seed(&name)
        ],
        bump
    )]
    pub list: Account<'info, TodoList>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct TodoList {
    pub list_owner: Pubkey,
    pub bump: u8,
    pub capacity: u16,
    pub name: String,
    pub lines: Vec<Pubkey>,
}

impl TodoList {
    fn space(name: &str, capacity: u16) -> usize {
        // discriminator + owner pubkey + bump + capacity
        8 + 32 + 1 + 2 + 
            // name string // 4 ?
            4 + name.len() +
            // vec of item pubkeys
            4 + (capacity as usize) * std::mem::size_of::<Pubkey>()
    }
}


